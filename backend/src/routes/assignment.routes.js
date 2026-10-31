import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { uploadSourceFile } from "../middleware/upload.middleware.js";
import { ROLES } from "../models/User.js";
import {
  createAssignment,
  getAssignments,
  getAssignment,
  deleteAssignment,
} from "../controllers/assignment.controller.js";

const router = Router();

router.use(authenticate);

// Role is checked before the upload middleware so unauthorized users cannot write files to disk.
router.post("/", requireRole(ROLES.TEACHER), uploadSourceFile, createAssignment);
router.get("/", getAssignments);
router.get("/:assignmentId", getAssignment);
router.delete("/:assignmentId", requireRole(ROLES.TEACHER), deleteAssignment);

export default router;
