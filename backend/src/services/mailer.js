import nodemailer from "nodemailer";

// Email is optional: it is only sent when SMTP settings are present in the environment.
let transporter;

export const isEmailEnabled = () => !!process.env.SMTP_HOST;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, text }) {
  if (!isEmailEnabled()) return false;
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || "NexTask <no-reply@nextask.app>",
      to,
      subject,
      text,
    });
    return true;
  } catch (error) {
    console.error(`Email to ${to} failed: ${error.message}`);
    return false;
  }
}
