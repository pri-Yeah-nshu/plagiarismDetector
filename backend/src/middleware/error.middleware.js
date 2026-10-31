import mongoose from "mongoose";
import multer from "multer";
import config from "../config/env.js";
import { ApiError } from "../utils/apiError.js";

const normalizeError = (error) => {
  if (error instanceof ApiError) return error;

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return new ApiError(
        413,
        `File is too large. Maximum allowed size is ${config.upload.maxFileSizeMb} MB.`,
        "FILE_TOO_LARGE",
      );
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return new ApiError(
        400,
        "Unexpected file field. Check the multipart field name.",
        "UNEXPECTED_FILE_FIELD",
      );
    }
    return new ApiError(400, "File upload failed", "UPLOAD_ERROR");
  }

  if (error?.type === "entity.parse.failed") {
    return new ApiError(
      400,
      "Request body contains invalid JSON",
      "INVALID_JSON",
    );
  }
  if (error?.type === "entity.too.large") {
    return new ApiError(413, "Request body is too large", "PAYLOAD_TOO_LARGE");
  }

  if (error instanceof mongoose.Error.CastError) {
    return new ApiError(
      400,
      `Invalid value for field "${error.path}"`,
      "INVALID_ID",
    );
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(error.errors).map((item) => item.message);
    return new ApiError(400, messages.join("; "), "VALIDATION_ERROR");
  }
  if (typeof error?.name === "string" && error.name.startsWith("Mongo")) {
    return new ApiError(
      503,
      "A database error occurred. Please try again later.",
      "DATABASE_ERROR",
    );
  }

  return new ApiError(
    500,
    "An unexpected error occurred",
    "INTERNAL_SERVER_ERROR",
  );
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const normalized = normalizeError(error);

  if (normalized.statusCode >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, error);
  }

  const body = {
    success: false,
    message: normalized.message,
    error: { code: normalized.code },
  };

  if (!config.isProduction && normalized.statusCode >= 500) {
    body.error.stack = error.stack;
  }

  return res.status(normalized.statusCode).json(body);
};

export default errorHandler;
