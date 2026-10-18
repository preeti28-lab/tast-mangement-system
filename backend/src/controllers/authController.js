import crypto from "node:crypto";
import User from "../models/User.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../utils/token.js";
import { logAudit } from "../services/auditService.js";
import { sendEmail, isEmailEnabled } from "../services/mailer.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PORTALS = ["admin", "manager"];
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

const sendAuth = (res, status, user) => {
  setAuthCookie(res, signToken(user._id));
  res.status(status).json({ user });
};

// POST /api/auth/register
export const register = async (req, res) => {
  const name = req.body.name?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;

  const errors = {};
  if (!name || name.length < 2) errors.name = "Name must be at least 2 characters";
  if (!email || !EMAIL_RE.test(email)) errors.email = "Please enter a valid email";
  if (!password || password.length < 8)
    errors.password = "Password must be at least 8 characters";
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  if (await User.exists({ email })) {
    return res.status(409).json({
      message: "An account with this email already exists",
      errors: { email: "An account with this email already exists" },
    });
  }

  // The very first account becomes the admin so a fresh install can be managed.
  const role = (await User.exists({ role: "admin" })) ? "user" : "admin";
  const user = await User.create({ name, email, password, role });
  await logAudit({ actor: user, action: "user.registered", targetUser: user._id, extraInvolved: [user._id] });
  sendAuth(res, 201, user);
};

// POST /api/auth/login
export const login = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  // Role portals (/admin/login, /manager/login) only let that role in.
  const portal = req.body.portal;
  if (portal !== undefined && portal !== null && portal !== "") {
    if (!PORTALS.includes(portal)) return res.status(400).json({ message: "Unknown login portal" });
    if (user.role !== portal) {
      return res.status(403).json({ message: `This login is for ${portal}s only. Use the regular login page.` });
    }
  }

  sendAuth(res, 200, user);
  // Move old cost-12 hashes to the faster work factor after replying, so this login isn't slowed.
  if (user.needsRehash()) {
    user.password = password;
    user.save().catch((error) => console.error(`Password rehash failed: ${error.message}`));
  }
};

// POST /api/auth/logout
export const logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
};

// GET /api/auth/me
// Includes the role's effective permissions so the UI can show or hide features.
export const me = (req, res) => {
  res.json({ user: { ...req.user.toJSON(), permissions: req.user.$locals.permissions } });
};


// POST /api/auth/forgot-password
// Always answers the same way so the endpoint can't be used to discover registered emails.
export const forgotPassword = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({
      message: "Validation failed",
      errors: { email: "Please enter a valid email" },
    });
  }

  const reply = () =>
    res.json({ message: "If an account exists for this email, an OTP has been sent to it." });

  const user = await User.findOne({ email }).select("+resetOtp.sentAt");
  if (!user) return reply();
  if (user.resetOtp?.sentAt && Date.now() - user.resetOtp.sentAt.getTime() < OTP_RESEND_MS) {
    return res.status(429).json({ message: "Please wait a minute before requesting another OTP" });
  }

  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  user.resetOtp = {
    hash: hashOtp(otp),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    sentAt: new Date(),
    attempts: 0,
  };
  await user.save();

  if (!isEmailEnabled() && process.env.NODE_ENV === "development") {
    console.log(`[dev] SMTP not configured. Password reset OTP for ${email}: ${otp}`);
  }
  // The code is in the subject so each OTP is its own email; with a fixed subject Gmail
  // folds every new OTP into the first one's thread and it looks like nothing arrived.
  const sent = await sendEmail({
    to: email,
    subject: `${otp} is your NexTask password reset OTP`,
    text:
      `Hi ${user.name},\n\nYour OTP to reset your NexTask password is: ${otp}\n\n` +
      `It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
  });
  if (isEmailEnabled() && !sent) {
    // Don't claim the OTP was sent, and don't hold the user to the resend cooldown.
    await User.updateOne({ _id: user._id }, { $unset: { "resetOtp.sentAt": "" } });
    return res.status(503).json({ message: "Couldn't send the OTP email right now. Please try again." });
  }
  reply();
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const otp = String(req.body.otp ?? "").trim();
  const { password } = req.body;

  const errors = {};
  if (!email || !EMAIL_RE.test(email)) errors.email = "Please enter a valid email";
  if (!/^\d{6}$/.test(otp)) errors.otp = "Enter the 6-digit OTP";
  if (!password || password.length < 8)
    errors.password = "Password must be at least 8 characters";
  if (Object.keys(errors).length) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const invalid = () =>
    res.status(400).json({ message: "Invalid or expired OTP", errors: { otp: "Invalid or expired OTP" } });

  const user = await User.findOne({ email }).select(
    "+resetOtp.hash +resetOtp.expiresAt +resetOtp.attempts"
  );
  const stored = user?.resetOtp;
  if (!stored?.hash || stored.expiresAt < new Date() || stored.attempts >= OTP_MAX_ATTEMPTS) {
    return invalid();
  }

  const match = crypto.timingSafeEqual(Buffer.from(hashOtp(otp)), Buffer.from(stored.hash));
  if (!match) {
    await User.updateOne({ _id: user._id }, { $inc: { "resetOtp.attempts": 1 } });
    return invalid();
  }

  user.password = password;
  user.resetOtp = undefined;
  await user.save();
  res.json({ message: "Password reset successfully. You can now log in." });
};
