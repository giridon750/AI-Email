require("dotenv").config();

const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const connectDatabase = require("./config/database");
const emailRoutes = require("./routes/emailRoutes");

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "degraded",
    database: databaseConnected ? "connected" : "disconnected",
  });
});

app.use("/api/email", emailRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      success: false,
      message: "Request body must contain valid JSON.",
    });
  }

  console.error("Request failed:", error.message);
  return res.status(500).json({
    success: false,
    message: "The server could not complete the request.",
  });
});

app.listen(port, () => {
  console.log(`Mail App API listening on http://localhost:${port}`);

  connectDatabase().catch((error) => {
    console.error(`MongoDB connection failed: ${error.message}`);
  });
});
