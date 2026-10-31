import dotenv from "dotenv";

dotenv.config();

const REQUIRED_VARIABLES = [
  "MONGODB_URI",
  "LLM_API_KEY",
  "LLM_MODEL",
  "LLM_BASE_URL",
  "JWT_SECRET",
  "TEACHER_EMAIL",
  "TEACHER_PASSWORD",
];
if (process.env.TEACHER_PASSWORD.length < 8) {
  console.error(
    "Configuration error: TEACHER_PASSWORD must be at least 8 characters.",
  );
  process.exit(1);
}

const missing = REQUIRED_VARIABLES.filter((name) => {
  const value = process.env[name];
  return !value || value.trim() === "";
});

if (missing.length > 0) {
  console.error("Configuration error: missing required environment variables:");
  missing.forEach((name) => console.error(`  - ${name}`));
  console.error(
    "Copy .env.example to .env and fill in the values, then restart the server.",
  );
  process.exit(1);
}

if (process.env.JWT_SECRET.trim().length < 32) {
  console.error(
    "Configuration error: JWT_SECRET must be at least 32 characters long.",
  );
  console.error(
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
  );
  process.exit(1);
}

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const nodeEnv = process.env.NODE_ENV || "development";
const maxFileSizeMb = toPositiveInt(process.env.MAX_FILE_SIZE_MB, 10);

const config = Object.freeze({
  env: nodeEnv,
  isProduction: nodeEnv === "production",
  port: toPositiveInt(process.env.PORT, 5000),
  mongodbUri: process.env.MONGODB_URI.trim(),
  clientUrls: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  upload: Object.freeze({
    maxFileSizeMb,
    maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
  }),
  analysis: Object.freeze({
    maxCharacters: toPositiveInt(process.env.MAX_ANALYSIS_CHARACTERS, 100000),
  }),
  llm: Object.freeze({
    apiKey: process.env.LLM_API_KEY.trim(),
    model: process.env.LLM_MODEL.trim(),
    baseUrl: process.env.LLM_BASE_URL.trim(),
    timeoutMs: toPositiveInt(process.env.LLM_TIMEOUT_MS, 90000),
  }),
  auth: Object.freeze({
    jwtSecret: process.env.JWT_SECRET.trim(),
    jwtExpiresIn: (process.env.JWT_EXPIRES_IN || "7d").trim(),
    teacherName: (process.env.TEACHER_NAME || "Dr. Vaibhav Neema").trim(),
    teacherEmail: process.env.TEACHER_EMAIL.trim().toLowerCase(),
    teacherPassword: process.env.TEACHER_PASSWORD,
    bcryptRounds: 10,
  }),
  rateLimit: Object.freeze({
    windowMs: 15 * 60 * 1000,
    max: toPositiveInt(process.env.RATE_LIMIT_MAX, 100),
    analysisMax: toPositiveInt(process.env.ANALYSIS_RATE_LIMIT_MAX, 10),
    loginMax: toPositiveInt(process.env.LOGIN_RATE_LIMIT_MAX, 20),
    signupMax: toPositiveInt(process.env.SIGNUP_RATE_LIMIT_MAX, 30),
  }),
});

export default config;
