import crypto from "node:crypto";
import mongoose from "mongoose";
import { app, request, registerUser, useTestDatabase } from "./helpers.js";

useTestDatabase();

describe("auth", () => {
  test("rejects invalid registration data with field errors", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: "nope", password: "123" })
      .expect(400);
    expect(Object.keys(res.body.errors).sort()).toEqual(["email", "name", "password"]);
  });

  test("first user becomes admin, later users are regular users", async () => {
    const first = await registerUser("First");
    const second = await registerUser("Second");
    expect(first.user.role).toBe("admin");
    expect(second.user.role).toBe("user");
  });

  test("stores a bcrypt hash and never returns the password", async () => {
    const { user } = await registerUser("Hash");
    expect(user.password).toBeUndefined();
    const stored = await mongoose.connection.collection("users").findOne({ email: user.email });
    expect(stored.password).toMatch(/^\$2[aby]\$12\$/);
  });

  test("sets an httpOnly cookie and /me returns the user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Cookie", email: "cookie@example.com", password: "password123" })
      .expect(201);
    expect(res.headers["set-cookie"][0]).toMatch(/token=.+HttpOnly/);

    const { agent, user } = await registerUser("Me");
    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body.user.email).toBe(user.email);
  });

  test("rejects duplicate emails", async () => {
    const { user } = await registerUser("Dup");
    await request(app)
      .post("/api/auth/register")
      .send({ name: "Dup", email: user.email.toUpperCase(), password: "password123" })
      .expect(409);
  });

  test("login checks the password", async () => {
    const { user, password } = await registerUser("Login");
    await request(app).post("/api/auth/login").send({ email: user.email, password: "wrongpass1" }).expect(401);
    await request(app).post("/api/auth/login").send({ email: user.email, password }).expect(200);
  });

  test("logout clears the session", async () => {
    const { agent } = await registerUser("Logout");
    await agent.post("/api/auth/logout").expect(200);
    await agent.get("/api/auth/me").expect(401);
  });

  test("protected routes need a valid token", async () => {
    await request(app).get("/api/tasks").expect(401);
    await request(app).get("/api/tasks").set("Authorization", "Bearer not-a-jwt").expect(401);
  });

  test("an invalid session cookie is cleared so the browser stops sending it", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "token=signed-with-an-old-secret").expect(401);
    expect(res.headers["set-cookie"][0]).toMatch(/^token=;.*Expires=Thu, 01 Jan 1970/);
  });

  describe("password reset with OTP", () => {
    // The OTP is only stored hashed, so tests plant a known one directly in the database.
    const plantOtp = (email, otp, extra = {}) =>
      mongoose.connection.collection("users").updateOne(
        { email },
        {
          $set: {
            "resetOtp.hash": crypto.createHash("sha256").update(otp).digest("hex"),
            "resetOtp.expiresAt": new Date(Date.now() + 60_000),
            "resetOtp.attempts": 0,
            ...extra,
          },
        }
      );

    test("forgot-password answers the same for known and unknown emails and stores a hashed OTP", async () => {
      const { user } = await registerUser("Forgot");
      const known = await request(app).post("/api/auth/forgot-password").send({ email: user.email }).expect(200);
      const unknown = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "nobody@example.com" })
        .expect(200);
      expect(known.body.message).toBe(unknown.body.message);

      const stored = await mongoose.connection.collection("users").findOne({ email: user.email });
      expect(stored.resetOtp.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(stored.resetOtp.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test("forgot-password is throttled to one OTP a minute", async () => {
      const { user } = await registerUser("Throttle");
      await request(app).post("/api/auth/forgot-password").send({ email: user.email }).expect(200);
      await request(app).post("/api/auth/forgot-password").send({ email: user.email }).expect(429);
    });

    test("a valid OTP resets the password once", async () => {
      const { user, password } = await registerUser("Reset");
      await plantOtp(user.email, "123456");
      await request(app)
        .post("/api/auth/reset-password")
        .send({ email: user.email, otp: "123456", password: "newpassword1" })
        .expect(200);

      await request(app).post("/api/auth/login").send({ email: user.email, password }).expect(401);
      await request(app).post("/api/auth/login").send({ email: user.email, password: "newpassword1" }).expect(200);
      await request(app)
        .post("/api/auth/reset-password")
        .send({ email: user.email, otp: "123456", password: "another123" })
        .expect(400);
    });

    test("wrong, expired or over-guessed OTPs are rejected", async () => {
      const { user } = await registerUser("BadOtp");
      const body = { email: user.email, otp: "123456", password: "newpassword1" };

      await plantOtp(user.email, "123456", { "resetOtp.expiresAt": new Date(Date.now() - 1000) });
      await request(app).post("/api/auth/reset-password").send(body).expect(400);

      await plantOtp(user.email, "123456");
      for (let i = 0; i < 5; i++) {
        await request(app).post("/api/auth/reset-password").send({ ...body, otp: "000000" }).expect(400);
      }
      // Correct code no longer works after too many wrong guesses.
      await request(app).post("/api/auth/reset-password").send(body).expect(400);
    });
  });
});
