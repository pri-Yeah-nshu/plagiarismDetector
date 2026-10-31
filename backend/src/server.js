import { ensureTeacherAccount } from "./services/auth.service.js";
import config from "./config/env.js";

import { connectDB, disconnectDB } from "./config/db.js";

import app from "./app.js";

const start = async () => {
  try {
    await connectDB();
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);

    process.exit(1);
  }

  // inside start(), after the connectDB try/catch:
  try {
    await ensureTeacherAccount();
  } catch (error) {
    console.error("Failed to set up the teacher account:", error.message);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`Server running in ${config.env} mode on port ${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await disconnectDB();
      } finally {
        process.exit(0);
      }
    });

    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
  });
};

start();
