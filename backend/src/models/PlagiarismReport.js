import mongoose from "mongoose";

export const VERDICTS = ["LOW", "MEDIUM", "HIGH"];

export const MATCH_TYPES = [
  "direct_copy",
  "paraphrase",
  "semantic_similarity",
  "structural_similarity",
  "reordered_content",
  "superficial_change",
  "other",
];

const score = {
  type: Number,
  required: true,
  min: [0, "Score must be at least 0"],
  max: [100, "Score must be at most 100"],
};

const matchedSectionSchema = new mongoose.Schema(
  {
    sourceText: { type: String, required: true },
    studentText: { type: String, required: true },
    similarity: score,
    type: { type: String, enum: MATCH_TYPES, default: "other" },
    explanation: { type: String, default: "" },
  },
  { _id: false },
);

const plagiarismReportSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
      maxlength: 200,
    },
    studentFileName: { type: String, trim: true },
    studentText: { type: String, select: false },

    // SHA-256 of the uploaded file's raw bytes: identical => byte-for-byte same file.
    fileHash: { type: String, index: true },
    // SHA-256 of the normalized extracted text: identical => same content, even
    // if the file was re-saved or exported differently.
    textHash: { type: String },

    overallSimilarityScore: score,
    directCopyScore: score,
    paraphraseScore: score,

    verdict: {
      type: String,
      enum: VERDICTS,
      required: true,
    },
    summary: { type: String, default: "" },

    matchedSections: { type: [matchedSectionSchema], default: [] },
    recommendations: { type: [String], default: [] },

    modelUsed: { type: String },
  },
  { timestamps: true },
);

// One submission per student per assignment. Partial so reports created before
// accounts existed (no studentId) are not affected.
plagiarismReportSchema.index(
  { assignmentId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { studentId: { $exists: true } } },
);
plagiarismReportSchema.index({ assignmentId: 1, fileHash: 1 });
plagiarismReportSchema.index({ assignmentId: 1, textHash: 1 });

const PlagiarismReport = mongoose.model(
  "PlagiarismReport",
  plagiarismReportSchema,
);

export default PlagiarismReport;
