import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import config from "./config/env.js";
import { apiLimiter } from "./middleware/rateLimit.middleware.js";
import notFound from "./middleware/notFound.middleware.js";
import errorHandler from "./middleware/error.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";
import plagiarismRoutes from "./routes/plagiarism.routes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.clientUrls,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(morgan(config.isProduction ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", apiLimiter);
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/plagiarism", plagiarismRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
