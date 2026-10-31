import mongoose from "mongoose";
import config from "./env.js";

export const connectDB = async () => {
  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  await mongoose.connect(config.mongodbUri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
};
