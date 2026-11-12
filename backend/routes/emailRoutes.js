const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Email = require("../models/Email");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const connectionErrorCodes = new Set([
  "ECONNECTION",
  "ECONNREFUSED",
  "ECONNRESET",
  "EDNS",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ESOCKET",
  "ETIMEDOUT",
]);

function getDeliveryFailure(error) {
  const rawCode =
    error && typeof error.code === "string" ? error.code : "UNKNOWN";
  const code = /^[A-Z0-9_]+$/.test(rawCode) ? rawCode : "UNKNOWN";
  const responseCode =
    error && Number.isInteger(error.responseCode) ? error.responseCode : null;

  if (code === "EMAIL_CONFIG_MISSING") {
    return {
      status: 503,
      code,
      responseCode,
      message:
        "Gmail SMTP is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in the backend environment.",
    };
  }

  if (code === "EAUTH" || responseCode === 534 || responseCode === 535) {
    return {
      status: 502,
      code,
      responseCode,
      message:
        "Gmail authentication failed. Check that GMAIL_USER is the full Gmail address and GMAIL_APP_PASSWORD is a valid App Password for an account with 2-Step Verification enabled.",
    };
  }

  if (connectionErrorCodes.has(code)) {
    return {
      status: 502,
      code,
      responseCode,
      message:
        "The backend could not connect to Gmail SMTP. Check the backend's outbound connection to Gmail on port 465 or 587.",
    };
  }

  if (code === "EENVELOPE" || [550, 553, 554].includes(responseCode)) {
    return {
      status: 502,
      code,
      responseCode,
      message:
        "Gmail rejected the recipient or message. Check the recipient address and the Gmail account's sending limits or policies.",
    };
  }

  if (responseCode >= 400 && responseCode < 500) {
    return {
      status: 502,
      code,
      responseCode,
      message:
        "Gmail temporarily rejected the email. Wait a moment and try again; check the backend logs if it continues.",
    };
  }

  return {
    status: 502,
    code,
    responseCode,
    message:
      "Gmail email delivery failed. Check the backend logs for the SMTP diagnostic code.",
  };
}

router.post("/send", async (req, res, next) => {
  const { to, subject, message } = req.body || {};

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message:
        "Email sending is unavailable because the database is disconnected. Check the backend MongoDB connection.",
    });
  }

  if (
    typeof to !== "string" ||
    !emailPattern.test(to.trim()) ||
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof message !== "string" ||
    !message.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid recipient email, subject, and message.",
    });
  }

  let savedEmail;
  let transporter;

  try {
    savedEmail = await Email.create({
      to: to.trim(),
      subject: subject.trim(),
      message: message.trim(),
    });
  } catch (error) {
    return next(error);
  }

  try {
    const user = (process.env.GMAIL_USER || "").trim();
    const pass = (process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
    const missingVariables = [];

    if (!user || user === "YOUR_GMAIL_ADDRESS") {
      missingVariables.push("GMAIL_USER");
    }
    if (!pass || pass === "YOUR_GMAIL_APP_PASSWORD") {
      missingVariables.push("GMAIL_APP_PASSWORD");
    }
    if (missingVariables.length) {
      const error = new Error("Gmail SMTP configuration is incomplete.");
      error.code = "EMAIL_CONFIG_MISSING";
      error.missingVariables = missingVariables;
      throw error;
    }

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.verify();
    console.info("Gmail SMTP verification succeeded.", {
      emailId: savedEmail.id,
    });

    await transporter.sendMail({
      from: user,
      to: savedEmail.to,
      subject: savedEmail.subject,
      text: savedEmail.message,
    });

    savedEmail.status = "sent";
    savedEmail.error = undefined;
    await savedEmail.save();
    console.info("Email sent successfully.", { emailId: savedEmail.id });

    return res.status(201).json({
      success: true,
      message: "Email sent successfully.",
      email: {
        id: savedEmail.id,
        to: savedEmail.to,
        subject: savedEmail.subject,
        status: savedEmail.status,
        createdAt: savedEmail.createdAt,
      },
    });
  } catch (error) {
    const failure = getDeliveryFailure(error);

    console.error("Email delivery failed.", {
      emailId: savedEmail.id,
      code: failure.code,
      responseCode: failure.responseCode,
      missingVariables:
        error && Array.isArray(error.missingVariables)
          ? error.missingVariables
          : undefined,
    });

    try {
      savedEmail.status = "failed";
      savedEmail.error = failure.message;
      await savedEmail.save();
    } catch (saveError) {
      return next(saveError);
    }

    return res.status(failure.status).json({
      success: false,
      message: failure.message,
      error: {
        code: failure.code,
        responseCode: failure.responseCode,
      },
      emailId: savedEmail.id,
    });
  } finally {
    if (transporter) {
      transporter.close();
    }
  }
});

module.exports = router;
