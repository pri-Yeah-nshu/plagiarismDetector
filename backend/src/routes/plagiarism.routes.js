import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { uploadStudentFile } from "../middleware/upload.middleware.js";
import { analysisLimiter } from "../middleware/rateLimit.middleware.js";
import { ROLES } from "../models/User.js";
import {
  checkPlagiarism,
  getReport,
  getReportsForAssignment,
  getDuplicates,
  getMySubmissions,
} from "../controllers/plagiarism.controller.js";

const router = Router();

router.use(authenticate);

// Student: submit work (auth + role + rate limit all run before the file is written to disk)
router.post(
  "/check/:assignmentId",
  requireRole(ROLES.STUDENT),
  analysisLimiter,
  uploadStudentFile,
  checkPlagiarism,
);
router.get("/my", requireRole(ROLES.STUDENT), getMySubmissions);

// Teacher: review results (only for their own assignments)
router.get("/reports/:reportId", requireRole(ROLES.TEACHER), getReport);
router.get(
  "/assignment/:assignmentId",
  requireRole(ROLES.TEACHER),
  getReportsForAssignment,
);
router.get(
  "/assignment/:assignmentId/duplicates",
  requireRole(ROLES.TEACHER),
  getDuplicates,
);

export default router;
