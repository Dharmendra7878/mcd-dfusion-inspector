const express = require("express");
const {
  getHealth,
  createMeme,
  listMemes,
  getStats,
  deleteMeme,
} = require("../controllers/memeController");

const router = express.Router();

router.get("/health", getHealth);
router.get("/memes/stats", getStats);
router.post("/memes", createMeme);
router.get("/memes", listMemes);
router.delete("/memes/:id", deleteMeme);

module.exports = router;
