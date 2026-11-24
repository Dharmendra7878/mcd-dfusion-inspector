require("dotenv").config();

const cors = require("cors");
const express = require("express");
const connectDB = require("./config/db");

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", require("./routes/memeRoutes"));

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ message: "Request body must be valid JSON" });
  }
  console.error("Unhandled API error:", error);
  return res.status(500).json({ message: "An unexpected server error occurred" });
});

const port = Number(process.env.PORT) || 5000;

async function start() {
  await connectDB();
  app.listen(port, () => {
    console.log(`MCD-DFusion API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Fatal: API startup failed:", error.message);
  process.exit(1);
});
