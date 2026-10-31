import PlagiarismReport from "../models/PlagiarismReport.js";
import { assertTeacherOwnsAssignment } from "./assignment.service.js";

export const DUPLICATE_TYPES = Object.freeze({
  IDENTICAL_FILE: "identical_file", // same bytes: the exact same PDF/DOCX/TXT
  IDENTICAL_TEXT: "identical_text", // same text, but the file itself differs
});

// Which student a report belongs to. Reports created before accounts existed
// have no studentId, so fall back to the name they were submitted under.
const studentKey = (report) => {
  const id = report.studentId?._id ?? report.studentId;
  return id ? String(id) : `legacy:${report.studentName}`;
};

const toMember = (report) => ({
  reportId: String(report._id),
  studentId: report.studentId?._id ? String(report.studentId._id) : report.studentId ? String(report.studentId) : null,
  studentName: report.studentId?.name || report.studentName,
  studentEmail: report.studentId?.email || null,
  studentFileName: report.studentFileName,
  submittedAt: report.createdAt,
  verdict: report.verdict,
  overallSimilarityScore: report.overallSimilarityScore,
});

const byTime = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);

const bucketBy = (reports, field) => {
  const buckets = new Map();
  for (const report of reports) {
    const value = report[field];
    if (!value) continue;
    if (!buckets.has(value)) buckets.set(value, []);
    buckets.get(value).push(report);
  }
  return buckets;
};

const distinctStudents = (reports) => new Set(reports.map(studentKey)).size;

/**
 * Pure function: given the reports of ONE assignment, returns the groups of
 * different students who submitted the same file.
 *
 *  - identical_file: the uploaded files are byte-for-byte the same.
 *  - identical_text: the extracted text is the same (ignoring case/whitespace)
 *    but the files are not byte-identical, e.g. re-saved or re-exported. Only
 *    reported when it adds information beyond an identical_file group.
 */
export const groupDuplicateReports = (reports) => {
  const groups = [];

  for (const [fileHash, members] of bucketBy(reports, "fileHash")) {
    if (distinctStudents(members) < 2) continue;

    const sorted = [...members].sort(byTime);
    groups.push({
      groupId: `file-${fileHash.slice(0, 12)}`,
      type: DUPLICATE_TYPES.IDENTICAL_FILE,
      fileHash,
      memberCount: sorted.length,
      firstSubmittedAt: sorted[0].createdAt,
      members: sorted.map(toMember),
    });
  }

  for (const [textHash, members] of bucketBy(reports, "textHash")) {
    if (distinctStudents(members) < 2) continue;

    // Everyone shares the exact same file: already covered by an identical_file group.
    const fileHashes = new Set(members.map((report) => report.fileHash));
    if (fileHashes.size === 1 && !fileHashes.has(undefined)) continue;

    const sorted = [...members].sort(byTime);
    groups.push({
      groupId: `text-${textHash.slice(0, 12)}`,
      type: DUPLICATE_TYPES.IDENTICAL_TEXT,
      textHash,
      memberCount: sorted.length,
      firstSubmittedAt: sorted[0].createdAt,
      members: sorted.map(toMember),
    });
  }

  groups.sort(
    (a, b) =>
      b.memberCount - a.memberCount ||
      new Date(a.firstSubmittedAt) - new Date(b.firstSubmittedAt),
  );

  return groups;
};

export const getDuplicateGroups = async (assignmentId, teacher) => {
  await assertTeacherOwnsAssignment(assignmentId, teacher.id);

  const reports = await PlagiarismReport.find({ assignmentId })
    .select(
      "studentId studentName studentFileName fileHash textHash createdAt verdict overallSimilarityScore",
    )
    .populate("studentId", "name email")
    .lean();

  const groups = groupDuplicateReports(reports);
  const involved = new Set(
    groups.flatMap((group) => group.members.map((member) => member.reportId)),
  );

  return {
    totalSubmissions: reports.length,
    totalGroups: groups.length,
    submissionsInGroups: involved.size,
    groups,
  };
};

/** Other students' reports on the same assignment that share this report's file. */
export const findSharedFileReports = async (report) => {
  if (!report.fileHash) return [];

  const others = await PlagiarismReport.find({
    assignmentId: report.assignmentId,
    fileHash: report.fileHash,
    _id: { $ne: report._id },
  })
    .select("studentId studentName createdAt")
    .lean();

  return others
    .filter((other) => studentKey(other) !== studentKey(report))
    .sort(byTime)
    .map((other) => ({
      reportId: String(other._id),
      studentName: other.studentName,
      submittedAt: other.createdAt,
    }));
};
