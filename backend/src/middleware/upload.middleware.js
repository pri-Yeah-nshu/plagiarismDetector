import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import multer from "multer";
import config from "../config/env.js";
import { ApiError } from "../utils/apiError.js";
import { getFileTypeFromUpload } from "../services/file.service.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "uploads")
  : path.resolve(currentDir, "../../uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const type = getFileTypeFromUpload(file.originalname, file.mimetype);

  if (!type) {
    return cb(
      new ApiError(
        415,
        "Unsupported file type. Only PDF, DOCX and TXT files are allowed.",
        "UNSUPPORTED_FILE_TYPE",
      ),
    );
  }

  return cb(null, true);
};

const buildUploader = (fieldName) =>
  multer({
    storage,
    fileFilter,
    limits: {
      fileSize: config.upload.maxFileSizeBytes,
      files: 1,
    },
  }).single(fieldName);

export const uploadSourceFile = buildUploader("sourceFile");
export const uploadStudentFile = buildUploader("studentFile");
