const mongoose = require("mongoose");
const MemeRecord = require("../models/MemeRecord");

function handleError(error, res, next) {
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  return next(error);
}

async function getHealth(_req, res) {
  res.json({ status: "ok", service: "mcd-dfusion-api" });
}

async function createMeme(req, res, next) {
  const { caption, mcdScore } = req.body || {};
  if (typeof caption !== "string" || !caption.trim()) {
    return res.status(400).json({ message: "caption is required and must be non-empty" });
  }
  if (mcdScore === undefined || mcdScore === null || !Number.isFinite(Number(mcdScore))) {
    return res.status(400).json({ message: "mcdScore is required and must be a number" });
  }

  try {
    const record = await MemeRecord.create({ ...req.body, caption: caption.trim() });
    return res.status(201).json(record);
  } catch (error) {
    return handleError(error, res, next);
  }
}

async function listMemes(req, res, next) {
  try {
    const query = {};
    if (req.query.conflictOnly === "true") query.isConflict = true;
    if (typeof req.query.sentiment === "string" && req.query.sentiment.trim()) {
      query.predictedSentiment = req.query.sentiment.trim();
    }
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      query.$or = [
        { caption: searchRegex },
        { ocrText: searchRegex },
        { note: searchRegex },
        { emojis: searchRegex },
      ];
    }
    const records = await MemeRecord.find(query).sort({ createdAt: -1 }).lean();
    return res.json(records);
  } catch (error) {
    return next(error);
  }
}

async function getStats(_req, res, next) {
  try {
    const [totalCases, conflictCases, flippedCases, average] = await Promise.all([
      MemeRecord.countDocuments(),
      MemeRecord.countDocuments({ isConflict: true }),
      MemeRecord.countDocuments({ sentimentFlipped: true }),
      MemeRecord.aggregate([{ $group: { _id: null, value: { $avg: "$mcdScore" } } }]),
    ]);
    return res.json({
      totalCases,
      conflictCases,
      averageMcdScore: average.length ? Number(average[0].value.toFixed(4)) : 0,
      flippedCases,
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteMeme(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid meme record id" });
  }
  try {
    const record = await MemeRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Meme record not found" });
    return res.status(200).json({ message: "Meme record deleted", id: record.id });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getHealth, createMeme, listMemes, getStats, deleteMeme };
