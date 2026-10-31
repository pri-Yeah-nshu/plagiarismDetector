import rateLimit from "express-rate-limit";
import config from "../config/env.js";
import { ApiError } from "../utils/apiError.js";

export const createRateLimiter = ({
  max,
  windowMs = config.rateLimit.windowMs,
  message = "Too many requests. Please try again later.",
  ...options
}) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(new ApiError(429, message, "RATE_LIMIT_EXCEEDED")),
    ...options,
  });

export const apiLimiter = createRateLimiter({ max: config.rateLimit.max });

// Runs after authentication, so the limit is per user rather than per IP.
// (Students on one campus network would otherwise share a single bucket.)
export const analysisLimiter = createRateLimiter({
  max: config.rateLimit.analysisMax,
  message: "Too many plagiarism checks requested. Please try again later.",
  keyGenerator: (req) => `user:${req.user.id}`,
});

// Only failed logins count, so shared IPs are not locked out by successful ones.
export const loginLimiter = createRateLimiter({
  max: config.rateLimit.loginMax,
  message: "Too many failed login attempts. Please try again later.",
  skipSuccessfulRequests: true,
});

export const signupLimiter = createRateLimiter({
  max: config.rateLimit.signupMax,
  message: "Too many sign-up attempts. Please try again later.",
});
