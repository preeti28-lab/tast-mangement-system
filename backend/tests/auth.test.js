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
});
