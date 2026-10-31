import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { ApiError } from "../utils/apiError.js";

export const FILE_TYPES = Object.freeze({
  pdf: {
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
  },
  docx: {
    extensions: [".docx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  txt: {
    extensions: [".txt"],
    mimeTypes: ["text/plain"],
  },
});

export const getFileTypeFromMime = (mimetype) => {
  const normalized = String(mimetype || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  return (
    Object.keys(FILE_TYPES).find((type) =>
      FILE_TYPES[type].mimeTypes.includes(normalized),
    ) || null
  );
};

export const getFileTypeFromUpload = (originalName, mimetype) => {
  const extension = path.extname(String(originalName || "")).toLowerCase();
  const type = getFileTypeFromMime(mimetype);

  if (!type) return null;
  return FILE_TYPES[type].extensions.includes(extension) ? type : null;
};

const hasValidSignature = (buffer, type) => {
  if (buffer.length === 0) return false;

  switch (type) {
    case "pdf":
      return buffer.subarray(0, 1024).toString("latin1").includes("%PDF-");
    case "docx":
      return (
        buffer.length > 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04
      );
    case "txt":
      return !buffer.subarray(0, 8000).includes(0x00);
    default:
      return false;
  }
};

export const normalizeText = (input) => {
  if (typeof input !== "string") return "";

  return input
    .replace(/\r\n?/g, "\n")
    .replace(/\u2028|\u2029/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u00A0\u200B\uFEFF\t]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const extractRawText = async (buffer, type) => {
  switch (type) {
    case "pdf": {
      const result = await pdfParse(buffer);
      return { text: result.text, extra: { pageCount: result.numpages } };
    }
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value, extra: {} };
    }
    case "txt":
      return { text: buffer.toString("utf8"), extra: {} };
    default:
      throw new ApiError(415, "Unsupported file type", "UNSUPPORTED_FILE_TYPE");
  }
};

export const extractTextFromFile = async (filePath, mimetype) => {
  const type = getFileTypeFromMime(mimetype);

  if (!type) {
    throw new ApiError(
      415,
      "Unsupported file type. Only PDF, DOCX and TXT files are allowed.",
      "UNSUPPORTED_FILE_TYPE",
    );
  }

  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch (error) {
    console.error(
      "[file.service] Failed to read uploaded file:",
      error.message,
    );
    throw new ApiError(
      500,
      "Failed to read the uploaded file",
      "FILE_READ_FAILED",
    );
  }

  if (!hasValidSignature(buffer, type)) {
    throw new ApiError(
      415,
      "The file content does not match its declared type or the file is empty",
      "INVALID_FILE_CONTENT",
    );
  }

  let extracted;
  try {
    extracted = await extractRawText(buffer, type);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`[file.service] ${type} extraction failed:`, error.message);
    throw new ApiError(
      422,
      `Failed to extract text from the ${type.toUpperCase()} file. The file may be corrupted or protected.`,
      "FILE_EXTRACTION_FAILED",
    );
  }

  const text = normalizeText(extracted.text);

  if (!text) {
    throw new ApiError(
      422,
      "No readable text could be extracted from the file. Scanned or image-only documents are not supported in Version 1.",
      "EMPTY_FILE_TEXT",
    );
  }

  return {
    text,
    metadata: {
      fileType: type,
      characterCount: text.length,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      ...extracted.extra,
    },
  };
};

/** SHA-256 of the file's raw bytes (streamed, so large files are not buffered twice). */
export const hashFile = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });

/** SHA-256 of the text with case and whitespace differences removed. */
export const hashText = (text) =>
  crypto
    .createHash("sha256")
    .update(String(text).toLowerCase().replace(/\s+/g, " ").trim())
    .digest("hex");

export const deleteFile = async (filePath) => {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn(
        "[file.service] Could not delete temporary file:",
        error.message,
      );
    }
  }
};
