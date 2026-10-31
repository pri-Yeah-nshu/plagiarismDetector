import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/env.js";
import User, { ROLES } from "../models/User.js";
import { ApiError } from "../utils/apiError.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt ignores everything after 72 bytes

// Compared against when the email is unknown, so "no such user" and
// "wrong password" take about the same time.
const DUMMY_HASH = bcrypt.hashSync(
  "not-a-real-password",
  config.auth.bcryptRounds,
);

const toUserResponse = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
});

const signToken = (user) =>
  jwt.sign({ role: user.role }, config.auth.jwtSecret, {
    subject: String(user._id),
    expiresIn: config.auth.jwtExpiresIn,
  });

const cleanEmail = (email) => {
  const value = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!value || !EMAIL_PATTERN.test(value) || value.length > 254) {
    throw new ApiError(
      400,
      "A valid email address is required",
      "VALIDATION_ERROR",
    );
  }
  return value;
};

const assertPasswordRules = (password) => {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      "VALIDATION_ERROR",
    );
  }
  if (Buffer.byteLength(password) > MAX_PASSWORD_LENGTH) {
    throw new ApiError(
      400,
      `Password must be at most ${MAX_PASSWORD_LENGTH} bytes`,
      "VALIDATION_ERROR",
    );
  }
};

export const signup = async ({ role, name, email, password, accessCode }) => {
  if (!Object.values(ROLES).includes(role)) {
    throw new ApiError(400, "Invalid role", "VALIDATION_ERROR");
  }

  const cleanName = typeof name === "string" ? name.trim() : "";
  if (!cleanName) {
    throw new ApiError(400, "Name is required", "VALIDATION_ERROR");
  }
  if (cleanName.length > 100) {
    throw new ApiError(
      400,
      "Name must be at most 100 characters",
      "VALIDATION_ERROR",
    );
  }

  const normalizedEmail = cleanEmail(email);
  assertPasswordRules(password);

  if (role !== ROLES.STUDENT) {
    throw new ApiError(
      403,
      "Teacher accounts cannot be created here",
      "TEACHER_SIGNUP_DISABLED",
    );
  }

  const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);

  let user;
  try {
    user = await User.create({
      name: cleanName,
      email: normalizedEmail,
      passwordHash,
      role,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(
        409,
        "An account with this email already exists",
        "EMAIL_TAKEN",
      );
    }
    throw error;
  }

  return { token: signToken(user), user: toUserResponse(user) };
};

export const login = async ({ role, email, password }) => {
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const user = normalizedEmail
    ? await User.findOne({ email: normalizedEmail }).select("+passwordHash")
    : null;

  const passwordOk = await bcrypt.compare(
    typeof password === "string" ? password : "",
    user?.passwordHash || DUMMY_HASH,
  );

  if (!user || !passwordOk) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  // Only reached with correct credentials, so this does not leak which emails exist.
  if (user.role !== role) {
    throw new ApiError(
      403,
      `This account is registered as a ${user.role}. Please use the ${user.role} login.`,
      "WRONG_ROLE",
    );
  }

  return { token: signToken(user), user: toUserResponse(user) };
};

export const authenticateToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, config.auth.jwtSecret);
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      throw new ApiError(
        401,
        "Your session has expired. Please log in again.",
        "TOKEN_EXPIRED",
      );
    }
    throw new ApiError(401, "Invalid authentication token", "INVALID_TOKEN");
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, "Account no longer exists", "INVALID_TOKEN");
  }

  return toUserResponse(user);
};

export { toUserResponse };
/** Creates or syncs the single teacher account from .env. Runs on every server start. */
export const ensureTeacherAccount = async () => {
  const { teacherName, teacherEmail, teacherPassword, bcryptRounds } =
    config.auth;

  const existing = await User.findOne({ email: teacherEmail }).select(
    "+passwordHash",
  );

  if (!existing) {
    await User.create({
      name: teacherName,
      email: teacherEmail,
      passwordHash: await bcrypt.hash(teacherPassword, bcryptRounds),
      role: ROLES.TEACHER,
    });
    console.log(`Teacher account created for ${teacherEmail}`);
    return;
  }

  if (existing.role !== ROLES.TEACHER) {
    throw new Error(
      `TEACHER_EMAIL (${teacherEmail}) already belongs to a student account`,
    );
  }

  let changed = false;
  if (existing.name !== teacherName) {
    existing.name = teacherName;
    changed = true;
  }
  if (!(await bcrypt.compare(teacherPassword, existing.passwordHash))) {
    existing.passwordHash = await bcrypt.hash(teacherPassword, bcryptRounds);
    changed = true;
  }
  if (changed) await existing.save();
};
