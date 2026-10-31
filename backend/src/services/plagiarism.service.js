import Assignment from "../models/Assignment.js";
import PlagiarismReport, {
  VERDICTS,
  MATCH_TYPES,
} from "../models/PlagiarismReport.js";
import config from "../config/env.js";
import { ApiError, assertValidObjectId } from "../utils/apiError.js";
import {
  extractTextFromFile,
  normalizeText,
  hashFile,
  hashText,
} from "./file.service.js";
import { analyzePlagiarism } from "./llm.service.js";
import { assertTeacherOwnsAssignment } from "./assignment.service.js";
import { findSharedFileReports } from "./duplicate.service.js";

const MAX_MATCHED_SECTIONS = 50;
const TOO_LARGE_MESSAGE =
  "Assignment is too large for Version 1 analysis. Please submit a shorter document.";

/* ----------------------------- size protection ---------------------------- */

export const assertWithinAnalysisLimit = (
  sourceText,
  studentText,
  maxCharacters = config.analysis.maxCharacters,
) => {
  const combinedLength = sourceText.length + studentText.length;

  if (combinedLength > maxCharacters) {
    throw new ApiError(413, TOO_LARGE_MESSAGE, "ASSIGNMENT_TOO_LARGE");
  }
};

/* ------------------------- LLM response validation ------------------------ */

const invalidResponse = (detail) => {
  console.error(`[plagiarism.service] Invalid LLM response: ${detail}`);
  return new ApiError(
    502,
    "The LLM returned an invalid analysis response. Please try again.",
    "INVALID_LLM_RESPONSE",
  );
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const parseLlmResponse = (rawContent) => {
  if (typeof rawContent !== "string" || !rawContent.trim()) {
    throw invalidResponse("empty content");
  }

  const trimmed = rawContent.trim();
  const candidates = [trimmed];

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isPlainObject(parsed)) return parsed;
    } catch {
      // try the next candidate
    }
  }

  throw invalidResponse("output is not parseable JSON");
};

const readScore = (value, field) => {
  const numeric =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof numeric !== "number" || !Number.isFinite(numeric)) {
    throw invalidResponse(`${field} must be a number`);
  }
  if (numeric < 0 || numeric > 100) {
    throw invalidResponse(`${field} must be between 0 and 100`);
  }

  return Math.round(numeric);
};

const readString = (value, field, { allowEmpty = false } = {}) => {
  if (typeof value !== "string") {
    throw invalidResponse(`${field} must be a string`);
  }

  const trimmed = value.trim();
  if (!allowEmpty && !trimmed) {
    throw invalidResponse(`${field} must not be empty`);
  }

  return trimmed;
};

const normalizeMatchType = (value) => {
  if (typeof value !== "string") return "other";

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return MATCH_TYPES.includes(normalized) ? normalized : "other";
};

const validateMatchedSection = (section, index) => {
  if (!isPlainObject(section)) {
    throw invalidResponse(`matchedSections[${index}] must be an object`);
  }

  return {
    sourceText: readString(
      section.sourceText,
      `matchedSections[${index}].sourceText`,
    ),
    studentText: readString(
      section.studentText,
      `matchedSections[${index}].studentText`,
    ),
    similarity: readScore(
      section.similarity,
      `matchedSections[${index}].similarity`,
    ),
    type: normalizeMatchType(section.type),
    explanation: readString(
      section.explanation,
      `matchedSections[${index}].explanation`,
      {
        allowEmpty: true,
      },
    ),
  };
};

export const validateAnalysis = (raw) => {
  if (!isPlainObject(raw)) {
    throw invalidResponse("root value must be an object");
  }

  const requiredKeys = [
    "overallSimilarityScore",
    "directCopyScore",
    "paraphraseScore",
    "verdict",
    "summary",
    "matchedSections",
    "recommendations",
  ];
  const missingKeys = requiredKeys.filter((key) => !(key in raw));
  if (missingKeys.length > 0) {
    throw invalidResponse(`missing properties: ${missingKeys.join(", ")}`);
  }

  const verdict = readString(raw.verdict, "verdict").toUpperCase();
  if (!VERDICTS.includes(verdict)) {
    throw invalidResponse("verdict must be LOW, MEDIUM or HIGH");
  }

  if (!Array.isArray(raw.matchedSections)) {
    throw invalidResponse("matchedSections must be an array");
  }
  if (!Array.isArray(raw.recommendations)) {
    throw invalidResponse("recommendations must be an array");
  }

  const recommendations = raw.recommendations.map((item, index) =>
    readString(item, `recommendations[${index}]`),
  );

  return {
    overallSimilarityScore: readScore(
      raw.overallSimilarityScore,
      "overallSimilarityScore",
    ),
    directCopyScore: readScore(raw.directCopyScore, "directCopyScore"),
    paraphraseScore: readScore(raw.paraphraseScore, "paraphraseScore"),
    verdict,
    summary: readString(raw.summary, "summary", { allowEmpty: true }),
    matchedSections: raw.matchedSections
      .slice(0, MAX_MATCHED_SECTIONS)
      .map((section, index) => validateMatchedSection(section, index)),
    recommendations,
  };
};

/* ------------------------------ main use cases ---------------------------- */

export const checkPlagiarism = async ({ assignmentId, student, file }) => {
  assertValidObjectId(assignmentId, "assignment ID");

  if (!file) {
    throw new ApiError(
      400,
      "A file is required (multipart field name: studentFile)",
      "FILE_REQUIRED",
    );
  }

  const assignment =
    await Assignment.findById(assignmentId).select("+sourceText");
  if (!assignment) {
    throw new ApiError(404, "Assignment not found", "ASSIGNMENT_NOT_FOUND");
  }

  const alreadySubmitted = await PlagiarismReport.exists({
    assignmentId: assignment._id,
    studentId: student.id,
  });
  if (alreadySubmitted) {
    throw new ApiError(
      409,
      "You have already submitted this assignment",
      "ALREADY_SUBMITTED",
    );
  }

  // Hash the raw upload before anything else touches it.
  const fileHash = await hashFile(file.path);

  const { text: studentText } = await extractTextFromFile(
    file.path,
    file.mimetype,
  );
  const sourceText = normalizeText(assignment.sourceText);

  assertWithinAnalysisLimit(sourceText, studentText);

  const { content, model } = await analyzePlagiarism(sourceText, studentText);
  const analysis = validateAnalysis(parseLlmResponse(content));

  let report;
  try {
    report = await PlagiarismReport.create({
      assignmentId: assignment._id,
      studentId: student.id,
      studentName: student.name,
      studentFileName: file.originalname,
      studentText,
      fileHash,
      textHash: hashText(studentText),
      ...analysis,
      modelUsed: model,
    });
  } catch (error) {
    // Two simultaneous submissions from the same student: the unique index wins.
    if (error?.code === 11000) {
      throw new ApiError(
        409,
        "You have already submitted this assignment",
        "ALREADY_SUBMITTED",
      );
    }
    throw error;
  }

  // Students get confirmation only; scores and findings are for the teacher.
  return {
    _id: report._id,
    assignmentId: report.assignmentId,
    studentFileName: report.studentFileName,
    createdAt: report.createdAt,
  };
};

export const getReportById = async (reportId, teacher) => {
  assertValidObjectId(reportId, "report ID");

  const report =
    await PlagiarismReport.findById(reportId).select("+studentText");
  if (!report) {
    throw new ApiError(404, "Plagiarism report not found", "REPORT_NOT_FOUND");
  }

  // Reports of other teachers' assignments look like they do not exist.
  await assertTeacherOwnsAssignment(String(report.assignmentId), teacher.id).catch(
    () => {
      throw new ApiError(404, "Plagiarism report not found", "REPORT_NOT_FOUND");
    },
  );

  return {
    ...report.toObject(),
    sharedFileWith: await findSharedFileReports(report),
  };
};

export const getReportsByAssignment = async (assignmentId, teacher) => {
  await assertTeacherOwnsAssignment(assignmentId, teacher.id);

  const reports = await PlagiarismReport.find({ assignmentId }).sort({
    createdAt: -1,
  });
  return reports.map((report) => report.toObject());
};

export const getMySubmissions = async (student) => {
  const reports = await PlagiarismReport.find({ studentId: student.id })
    .select("assignmentId studentFileName createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return reports.map((report) => ({
    reportId: String(report._id),
    assignmentId: String(report.assignmentId),
    fileName: report.studentFileName,
    submittedAt: report.createdAt,
  }));
};
