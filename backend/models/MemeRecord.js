const mongoose = require("mongoose");

const memeRecordSchema = new mongoose.Schema(
  {
    caption: { type: String, required: true, trim: true },
    ocrText: { type: String, default: "" },
    emojis: { type: String, default: "" },
    perturbEmojis: { type: String, default: "" },
    imageMood: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral",
    },
    imageUrl: { type: String, default: "" },
    mcdScore: { type: Number, required: true },
    consistencyThreshold: { type: Number, default: 0.55 },
    fusionMode: { type: String, required: true },
    predictedSentiment: { type: String, required: true },
    isConflict: { type: Boolean, default: false },
    sentimentFlipped: { type: Boolean, default: false },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MemeRecord", memeRecordSchema);
