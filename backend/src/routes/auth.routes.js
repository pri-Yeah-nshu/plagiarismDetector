import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  loginLimiter,
  signupLimiter,
} from "../middleware/rateLimit.middleware.js";
import { getMe, loginAs, signupAs } from "../controllers/auth.controller.js";
import { ROLES } from "../models/User.js";

const router = Router();

// Separate endpoints per role: /student/* and /teacher/*
router.post("/student/signup", signupLimiter, signupAs(ROLES.STUDENT));
router.post("/student/login", loginLimiter, loginAs(ROLES.STUDENT));
router.post("/teacher/login", loginLimiter, loginAs(ROLES.TEACHER));

router.get("/me", authenticate, getMe);

export default router;
