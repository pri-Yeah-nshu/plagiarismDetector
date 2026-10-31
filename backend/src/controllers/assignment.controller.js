import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { deleteFile } from "../services/file.service.js";
import * as assignmentService from "../services/assignment.service.js";

export const createAssignment = asyncHandler(async (req, res) => {
  try {
    const assignment = await assignmentService.createAssignment({
      title: req.body?.title,
      description: req.body?.description,
      file: req.file,
      teacher: req.user,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Assignment created successfully",
      data: { assignment },
    });
  } finally {
    await deleteFile(req.file?.path);
  }
});

export const getAssignments = asyncHandler(async (req, res) => {
  const assignments = await assignmentService.getAssignments(req.user);

  return sendSuccess(res, {
    message: "Assignments retrieved successfully",
    data: { count: assignments.length, assignments },
  });
});

export const getAssignment = asyncHandler(async (req, res) => {
  const assignment = await assignmentService.getAssignmentById(
    req.params.assignmentId,
    req.user,
  );

  return sendSuccess(res, {
    message: "Assignment retrieved successfully",
    data: { assignment },
  });
});

export const deleteAssignment = asyncHandler(async (req, res) => {
  const result = await assignmentService.deleteAssignment(
    req.params.assignmentId,
    req.user,
  );

  return sendSuccess(res, {
    message: "Assignment and associated reports deleted successfully",
    data: result,
  });
});
