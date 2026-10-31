import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Teacher is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title must be at most 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Description must be at most 2000 characters"],
    },
    sourceFileName: {
      type: String,
      trim: true,
    },
    sourceFileType: {
      type: String,
      enum: ["pdf", "docx", "txt"],
    },
    sourceText: {
      type: String,
      required: [true, "Source text is required"],
      select: false,
    },
  },
  { timestamps: true },
);

const Assignment = mongoose.model("Assignment", assignmentSchema);

export default Assignment;
