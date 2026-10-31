import path from "node:path";
import Assignment from "../models/Assignment.js";
import PlagiarismReport from "../models/PlagiarismReport.js";
import { ROLES } from "../models/User.js";
import { ApiError, assertValidObjectId } from "../utils/apiError.js";
import { extractTextFromFile } from "./file.service.js";

const NOT_FOUND = () =>
  new ApiError(404, "Assignment not found", "ASSIGNMENT_NOT_FOUND");

// Teachers see everything about their own assignments. Students only see what
// they need to submit: the source file's name is hidden from them.
const toAssignmentResponse = (assignment, viewer) => {
  const plain = assignment.toObject();
  delete plain.sourceText;

  if (plain.teacherId && typeof plain.teacherId === "object" && plain.teacherId.name) {
    plain.teacherName = plain.teacherId.name;
    plain.teacherId = plain.teacherId._id;
  }

  if (viewer.role === ROLES.STUDENT) {
    delete plain.sourceFileName;
    delete plain.sourceFileType;
  }

  return plain;
};

/**
 * Loads an assignment and checks that the teacher owns it. A teacher asking for
 * someone else's assignment gets 404, so IDs cannot be probed.
 */
export const assertTeacherOwnsAssignment = async (assignmentId, teacherId) => {
  assertValidObjectId(assignmentId, "assignment ID");

  const assignment = await Assignment.findOne({ _id: assignmentId, teacherId });
  if (!assignment) throw NOT_FOUND();

  return assignment;
};

export const createAssignment = async ({ title, description, file, teacher }) => {
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  const cleanDescription =
    typeof description === "string" ? description.trim() : "";

  if (!cleanTitle) {
    throw new ApiError(400, "title is required", "VALIDATION_ERROR");
  }
  if (cleanTitle.length > 200) {
    throw new ApiError(
      400,
      "title must be at most 200 characters",
      "VALIDATION_ERROR",
    );
  }
  if (cleanDescription.length > 2000) {
    throw new ApiError(
      400,
      "description must be at most 2000 characters",
      "VALIDATION_ERROR",
    );
  }
  if (!file) {
    throw new ApiError(
      400,
      "A source file is required (multipart field name: sourceFile)",
      "FILE_REQUIRED",
    );
  }

  const { text, metadata } = await extractTextFromFile(
    file.path,
    file.mimetype,
  );

  const assignment = await Assignment.create({
    teacherId: teacher.id,
    title: cleanTitle,
    description: cleanDescription,
    sourceFileName: path.basename(file.originalname).slice(0, 255),
    sourceFileType: metadata.fileType,
    sourceText: text,
  });

  return toAssignmentResponse(assignment, teacher);
};

export const getAssignments = async (viewer) => {
  if (viewer.role === ROLES.TEACHER) {
    const assignments = await Assignment.find({ teacherId: viewer.id }).sort({
      createdAt: -1,
    });
    return assignments.map((item) => toAssignmentResponse(item, viewer));
  }

  const assignments = await Assignment.find()
    .sort({ createdAt: -1 })
    .populate("teacherId", "name");
  return assignments.map((item) => toAssignmentResponse(item, viewer));
};

export const getAssignmentById = async (assignmentId, viewer) => {
  assertValidObjectId(assignmentId, "assignment ID");

  const query =
    viewer.role === ROLES.TEACHER
      ? Assignment.findOne({ _id: assignmentId, teacherId: viewer.id })
      : Assignment.findById(assignmentId).populate("teacherId", "name");

  const assignment = await query;
  if (!assignment) throw NOT_FOUND();

  return toAssignmentResponse(assignment, viewer);
};

export const deleteAssignment = async (assignmentId, teacher) => {
  assertValidObjectId(assignmentId, "assignment ID");

  const assignment = await Assignment.findOneAndDelete({
    _id: assignmentId,
    teacherId: teacher.id,
  });
  if (!assignment) throw NOT_FOUND();

  const { deletedCount } = await PlagiarismReport.deleteMany({ assignmentId });

  return { deletedReports: deletedCount };
};
