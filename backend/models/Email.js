const mongoose = require("mongoose");

const emailSchema = new mongoose.Schema(
  {
    to: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    error: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
    bufferCommands: false,
  },
);

module.exports = mongoose.model("Email", emailSchema);
