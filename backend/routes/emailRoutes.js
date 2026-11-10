const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Email = require("../models/Email");

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeDeliveryError =
  "Email delivery failed. Check the Gmail settings and try again.";

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
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (
      !user ||
      user === "YOUR_GMAIL_ADDRESS" ||
      !pass ||
      pass === "YOUR_GMAIL_APP_PASSWORD"
    ) {
      throw new Error("Gmail credentials are not configured.");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
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
    try {
      savedEmail.status = "failed";
      savedEmail.error = safeDeliveryError;
      await savedEmail.save();
    } catch (saveError) {
      return next(saveError);
    }

    console.error("Email delivery failed:", error.message);
    return res.status(502).json({
      success: false,
      message: safeDeliveryError,
      emailId: savedEmail.id,
    });
  }
});

module.exports = router;
