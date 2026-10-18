import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getRoleAccess, permissionsFor } from "../services/accessService.js";
import { COOKIE_NAME, clearAuthCookie } from "../utils/token.js";

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  const token =
    req.cookies?.[COOKIE_NAME] ||
    (header?.startsWith("Bearer ") ? header.slice(7) : null);

  if (!token) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // A bad cookie (expired, signed with an old secret, deleted user) is cleared so the
  // browser doesn't keep sending it and the frontend's redirects can't loop.
  let id;
  try {
    ({ id } = jwt.verify(token, process.env.JWT_SECRET));
  } catch {
    clearAuthCookie(res);
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const user = await User.findById(id);
  if (!user) {
    clearAuthCookie(res);
    return res.status(401).json({ message: "User no longer exists" });
  }
  // Role permissions are read per request so an admin's change applies at once.
  user.$locals.permissions = permissionsFor(user.role, await getRoleAccess());
  req.user = user;
  next();
};

// Allows the request only when the user has the given permission (see accessService).
export const requirePermission = (key) => (req, res, next) => {
  if (!req.user.$locals.permissions?.[key]) {
    return res.status(403).json({ message: "You don't have permission to do this" });
  }
  next();
};

// Allows the request only for the given roles. Use after `protect`.
export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You don't have permission to do this" });
    }
    next();
  };
