import User from "../models/User.js";
import { escapeRegex } from "../utils/escapeRegex.js";

// GET /api/users?search=
// Registered users that a task can be assigned to.
export const listUsers = async (req, res) => {
  const search = req.query.search?.toString().trim();
  const filter = {};
  if (search) {
    const re = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: re }, { email: re }];
  }
  const users = await User.find(filter).select("name email").sort({ name: 1 }).limit(100);
  res.json({ users });
};
