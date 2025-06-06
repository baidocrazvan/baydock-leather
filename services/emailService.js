import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import ejs from "ejs";
import fs from "fs";

const template = fs.readFileSync("views/emails/confirmation.ejs", "utf-8");
const resetTemplate = fs.readFileSync(
  "views/emails/password-reset.ejs",
  "utf-8"
);

// Create transporter
let transporter;
if (process.env.NODE_ENV === "development") {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // Only for Mailtrap
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}
export function generateConfirmationToken() {
  return uuidv4();
}

export async function sendConfirmationEmail(email, token, req) {
  const confirmationLink = `${process.env.BASE_URL}/auth/confirm?token=${token}`;
  console.log("START sendConfirmationEmail", process.env.NODE_ENV);
  console.log("NODE_ENV value is: >" + process.env.NODE_ENV + "<");
  if (process.env.NODE_ENV === "production") {
    console.log("IN PRODUCTION IF BLOCK");
    req.flash(
      "info",
      `<p class="demo">Demo: Confirm your account <a class="confirmation-link" href=${confirmationLink}>here</a></p>`
    );
    return;
  }
  console.log("AFTER PRODUCTION IF BLOCK");
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Confirm Your Accont",
      html: ejs.render(template, { confirmationLink }),
    });
  } catch (err) {
    console.error("Account confirmation email error:", err);
    throw new Error("Failed to send confirmation email");
  }
}

export async function sendResetEmail(email, resetLink, req) {
  if (process.env.NODE_ENV === "production") {
    req.flash(
      "info",
      `<p class="demo">Demo: Confirm your account <a class="confirmation-link" href=${resetLink}>here</a></p>`
    );
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Password Reset Request",
      html: ejs.render(resetTemplate, { resetLink }),
    });
  } catch (err) {
    console.error("Password reset email error:", err);
    throw new Error("Failed to send reset email");
  }
}
