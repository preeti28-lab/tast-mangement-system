import request from "supertest";
import app from "../src/app.js";
import { registerUser, useTestDatabase } from "./helpers.js";

useTestDatabase();

describe("profile", () => {
  test("users can rename themselves", async () => {
    const alice = await registerUser("Alice");
    const res = await alice.agent.patch("/api/users/me").send({ name: "  Alice Cooper  " }).expect(200);
    expect(res.body.user.name).toBe("Alice Cooper");
    expect((await alice.agent.get("/api/auth/me")).body.user.name).toBe("Alice Cooper");
  });

  test("rejects names that are too short", async () => {
    const alice = await registerUser("Alice");
    const res = await alice.agent.patch("/api/users/me").send({ name: "A" }).expect(400);
    expect(res.body.errors.name).toBeDefined();
  });

  test("changing the password needs the current one", async () => {
    const alice = await registerUser("Alice");
    const wrong = await alice.agent.put("/api/users/me/password").send({ currentPassword: "nope12345", newPassword: "newpass123" }).expect(400);
    expect(wrong.body.errors.currentPassword).toBeDefined();

    await alice.agent.put("/api/users/me/password").send({ currentPassword: alice.password, newPassword: "newpass123" }).expect(200);
    await request(app).post("/api/auth/login").send({ email: alice.user.email, password: alice.password }).expect(401);
    await request(app).post("/api/auth/login").send({ email: alice.user.email, password: "newpass123" }).expect(200);
  });

  test("new password must differ and be long enough", async () => {
    const alice = await registerUser("Alice");
    const same = await alice.agent.put("/api/users/me/password").send({ currentPassword: alice.password, newPassword: alice.password }).expect(400);
    expect(same.body.errors.newPassword).toBeDefined();
    await alice.agent.put("/api/users/me/password").send({ currentPassword: alice.password, newPassword: "short" }).expect(400);
  });

  test("requires login", async () => {
    await request(app).patch("/api/users/me").send({ name: "X Y" }).expect(401);
  });
});
