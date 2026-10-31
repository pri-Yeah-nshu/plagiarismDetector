import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { deleteFile } from "../services/file.service.js";
import * as plagiarismService from "../services/plagiarism.service.js";
import * as duplicateService from "../services/duplicate.service.js";

export const checkPlagiarism = asyncHandler(async (req, res) => {
  try {
    const submission = await plagiarismService.checkPlagiarism({
      assignmentId: req.params.assignmentId,
      student: req.user,
      file: req.file,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: "Submission received and analyzed",
      data: { submission },
    });
  } finally {
    await deleteFile(req.file?.path);
  }
});

export const getReport = asyncHandler(async (req, res) => {
  const report = await plagiarismService.getReportById(
    req.params.reportId,
    req.user,
  );

  return sendSuccess(res, {
    message: "Plagiarism report retrieved successfully",
    data: { report },
  });
});

export const getReportsForAssignment = asyncHandler(async (req, res) => {
  const reports = await plagiarismService.getReportsByAssignment(
    req.params.assignmentId,
    req.user,
  );

  return sendSuccess(res, {
    message: "Plagiarism reports retrieved successfully",
    data: { count: reports.length, reports },
  });
});

export const getDuplicates = asyncHandler(async (req, res) => {
  const result = await duplicateService.getDuplicateGroups(
    req.params.assignmentId,
    req.user,
  );

  return sendSuccess(res, {
    message: "Duplicate submission groups retrieved successfully",
    data: result,
  });
});

export const getMySubmissions = asyncHandler(async (req, res) => {
  const submissions = await plagiarismService.getMySubmissions(req.user);

  return sendSuccess(res, {
    message: "Your submissions retrieved successfully",
    data: { count: submissions.length, submissions },
  });
});
