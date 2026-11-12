require("dotenv").config();

const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const connectDatabase = require("./config/database");
const emailRoutes = require("./routes/emailRoutes");

const app = express();
const port = Number(process.env.PORT) || 3000;
const allowedFrontendOrigins = new Set(
  (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => origin.replace(/\/+$/, ""))
    .concat([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:4173",
      "http://127.0.0.1:4173",
    ]),
);

function logMongoConnectionError(error) {
  const name = error instanceof Error ? error.name : "UnknownError";
  const message = error instanceof Error ? error.message : String(error);
  const safeMessage = message
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "[REDACTED_MONGODB_URI]")
    .replace(/(password|passwd|pwd)\s*[:=]\s*[^,\s]+/gi, "$1=[REDACTED]")
    .slice(0, 1000);

  console.error(`MongoDB connection failed (${name}): ${safeMessage}`);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedFrontendOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Mail App API is running.",
    endpoints: {
      health: "GET /api/health",
      sendEmail: "POST /api/email/send",
    },
  });
});

app.get("/api/health", (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? "ok" : "degraded",
    server: "running",
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

let isShuttingDown = false;
let databaseRetryTimer;
let databaseRetryDelay = 5000;

async function connectDatabaseWithRetry() {
  if (isShuttingDown) {
    return;
  }

  try {
    await connectDatabase();
    databaseRetryDelay = 5000;
  } catch (error) {
    logMongoConnectionError(error);

    if (!isShuttingDown) {
      console.error(
        `Retrying MongoDB connection in ${databaseRetryDelay / 1000} seconds.`,
      );
      databaseRetryTimer = setTimeout(() => {
        databaseRetryTimer = undefined;
        databaseRetryDelay = Math.min(databaseRetryDelay * 2, 60000);
        void connectDatabaseWithRetry();
      }, databaseRetryDelay);
    }
  }
}

const server = app.listen(port, () => {
  console.log(`Mail App API listening on port ${port}`);
  void connectDatabaseWithRetry();
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other server or set PORT to an available port.`,
    );
    process.exitCode = 1;
    return;
  }

  console.error(`Mail App API failed to start: ${error.message}`);
  process.exitCode = 1;
});

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  clearTimeout(databaseRetryTimer);
  console.log(`Received ${signal}; shutting down the API.`);

  server.close(async (error) => {
    if (error) {
      console.error(`HTTP server shutdown failed: ${error.message}`);
      process.exitCode = 1;
    }

    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      logMongoConnectionError(disconnectError);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
