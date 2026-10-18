import jwt from "jsonwebtoken";

export const COOKIE_NAME = "token";

export const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
};

// Short-lived token for the Socket.io connection. The realtime server runs on a
// different origin, so it can't read the httpOnly auth cookie; the client fetches
// this token through the API (cookie-authenticated) and sends it in the handshake.
export const signSocketToken = (userId) =>
  jwt.sign({ id: userId, purpose: "socket" }, process.env.JWT_SECRET, { expiresIn: "5m" });

export const verifySocketToken = (token) => {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload.purpose !== "socket") throw new Error("Not a socket token");
  return payload;
};
