import User from "../models/User.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../utils/token.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

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

  const user = await User.create({ name, email, password });
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

  sendAuth(res, 200, user);
};

// POST /api/auth/logout
export const logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
};

// GET /api/auth/me
export const me = (req, res) => {
  res.json({ user: req.user });
};
