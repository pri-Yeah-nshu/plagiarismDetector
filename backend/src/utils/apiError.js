const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export class ApiError extends Error {
  constructor(statusCode, message, code = "INTERNAL_SERVER_ERROR") {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const assertValidObjectId = (id, label = "ID") => {
  if (typeof id !== "string" || !OBJECT_ID_PATTERN.test(id)) {
    throw new ApiError(400, `Invalid ${label}`, "INVALID_ID");
  }
};
