import request from "supertest";
import app from "../src/app.js";
import { registerUser, useTestDatabase } from "./helpers.js";

useTestDatabase();

/** First account is the admin; the rest get the given roles. */
async function team() {
  const admin = await registerUser("Admin");
  const manager = await registerUser("Manager");
  const member = await registerUser("Member");
  await admin.agent.patch(`/api/users/${manager.user._id}/role`).send({ role: "manager" }).expect(200);
  return { admin, manager, member };
}

const setAccess = (admin, body) => admin.agent.put("/api/settings/access").send(body);

describe("role access settings", () => {
  test("only admins can read or change them", async () => {
    const { admin, manager, member } = await team();
    await manager.agent.get("/api/settings/access").expect(403);
    await member.agent.put("/api/settings/access").send({ user: { "tasks.viewAll": true } }).expect(403);
    const { body } = await admin.agent.get("/api/settings/access").expect(200);
    expect(body.access.manager["tasks.viewAll"]).toBe(true);
    expect(body.access.user["tasks.viewAll"]).toBe(false);
    expect(body.permissions.length).toBeGreaterThan(3);
  });

  test("/me returns the role's effective permissions", async () => {
    const { admin, member } = await team();
    expect((await admin.agent.get("/api/auth/me")).body.user.permissions["users.manage"]).toBe(true);
    expect((await member.agent.get("/api/auth/me")).body.user.permissions["tasks.viewAll"]).toBe(false);
  });

  test("turning a switch off takes effect immediately", async () => {
    const { admin, manager } = await team();
    await manager.agent.get("/api/tasks?view=team").expect(200);
    await setAccess(admin, { manager: { "tasks.viewAll": false } }).expect(200);
    await manager.agent.get("/api/tasks?view=team").expect(403);
    await manager.agent.get("/api/analytics?scope=team").expect(200);
  });

  test("granting members team analytics works", async () => {
    const { admin, member } = await team();
    await member.agent.get("/api/analytics?scope=team").expect(403);
    await setAccess(admin, { user: { "analytics.team": true } }).expect(200);
    await member.agent.get("/api/analytics?scope=team").expect(200);
  });

  test("rejects non-boolean values", async () => {
    const { admin } = await team();
    await setAccess(admin, { user: { "tasks.viewAll": "yes" } }).expect(400);
  });

  test("assigning to others can be switched off", async () => {
    const { admin, member, manager } = await team();
    await setAccess(admin, { user: { "tasks.assignOthers": false } }).expect(200);
    const res = await member.agent.post("/api/tasks").send({ title: "T", assignedTo: manager.user._id }).expect(400);
    expect(res.body.errors.assignedTo).toMatch(/yourself/);
    await member.agent.post("/api/tasks").send({ title: "Mine", assignedTo: member.user._id }).expect(201);
  });

  test("delete-any lets a manager delete others' tasks", async () => {
    const { admin, manager, member } = await team();
    const { body } = await member.agent.post("/api/tasks").send({ title: "T" }).expect(201);
    await manager.agent.delete(`/api/tasks/${body.task._id}`).expect(403);
    await setAccess(admin, { manager: { "tasks.deleteAny": true } }).expect(200);
    await manager.agent.delete(`/api/tasks/${body.task._id}`).expect(200);
  });
});

describe("role login portals", () => {
  test("admin portal only admits admins", async () => {
    const { admin, member } = await team();
    await request(app).post("/api/auth/login").send({ email: admin.user.email, password: admin.password, portal: "admin" }).expect(200);
    const res = await request(app).post("/api/auth/login").send({ email: member.user.email, password: member.password, portal: "admin" }).expect(403);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  test("manager portal only admits managers", async () => {
    const { admin, manager } = await team();
    await request(app).post("/api/auth/login").send({ email: manager.user.email, password: manager.password, portal: "manager" }).expect(200);
    await request(app).post("/api/auth/login").send({ email: admin.user.email, password: admin.password, portal: "manager" }).expect(403);
  });

  test("wrong password still says invalid credentials, unknown portal is rejected", async () => {
    const { member } = await team();
    await request(app).post("/api/auth/login").send({ email: member.user.email, password: "wrongpass1", portal: "admin" }).expect(401);
    await request(app).post("/api/auth/login").send({ email: member.user.email, password: member.password, portal: "boss" }).expect(400);
  });
});

describe("user management", () => {
  test("admin creates, edits and deletes users", async () => {
    const { admin } = await team();
    const created = await admin.agent
      .post("/api/users")
      .send({ name: "New Person", email: "new@example.com", password: "password123", role: "manager" })
      .expect(201);
    const id = created.body.user._id;
    expect(created.body.user.role).toBe("manager");
    await request(app).post("/api/auth/login").send({ email: "new@example.com", password: "password123" }).expect(200);

    const edited = await admin.agent.patch(`/api/users/${id}`).send({ name: "Renamed", role: "user" }).expect(200);
    expect(edited.body.user).toMatchObject({ name: "Renamed", role: "user" });

    await admin.agent.delete(`/api/users/${id}`).expect(200);
    await request(app).post("/api/auth/login").send({ email: "new@example.com", password: "password123" }).expect(401);
  });

  test("validates input and duplicate emails", async () => {
    const { admin, member } = await team();
    const res = await admin.agent.post("/api/users").send({ name: "X", email: member.user.email, password: "short" }).expect(400);
    expect(Object.keys(res.body.errors).sort()).toEqual(["email", "name", "password"]);
  });

  test("deleting a user unassigns their tasks and hands over the ones they created", async () => {
    const { admin, member, manager } = await team();
    const mine = await member.agent.post("/api/tasks").send({ title: "Created by member" }).expect(201);
    const theirs = await manager.agent.post("/api/tasks").send({ title: "For member", assignedTo: member.user._id }).expect(201);

    const res = await admin.agent.delete(`/api/users/${member.user._id}`).expect(200);
    expect(res.body).toMatchObject({ unassignedTasks: 1, movedTasks: 1 });
    const a = await admin.agent.get(`/api/tasks/${mine.body.task._id}`).expect(200);
    expect(a.body.task.createdBy._id).toBe(admin.user._id);
    const b = await admin.agent.get(`/api/tasks/${theirs.body.task._id}`).expect(200);
    expect(b.body.task.assignedTo).toBeNull();
  });

  test("admins can't delete or demote themselves", async () => {
    const { admin } = await team();
    await admin.agent.delete(`/api/users/${admin.user._id}`).expect(400);
    const res = await admin.agent.patch(`/api/users/${admin.user._id}`).send({ role: "user" }).expect(400);
    expect(res.body.errors.role).toMatch(/own role/);
  });

  test("managers need the users.manage permission, and never touch admins", async () => {
    const { admin, manager, member } = await team();
    await manager.agent.patch(`/api/users/${member.user._id}`).send({ name: "Nope Nope" }).expect(403);

    await setAccess(admin, { manager: { "users.manage": true } }).expect(200);
    await manager.agent.patch(`/api/users/${member.user._id}`).send({ name: "Renamed Member" }).expect(200);
    await manager.agent.patch(`/api/users/${admin.user._id}`).send({ name: "Hacked" }).expect(403);
    await manager.agent.delete(`/api/users/${admin.user._id}`).expect(403);
    const promote = await manager.agent.patch(`/api/users/${member.user._id}`).send({ role: "admin" }).expect(400);
    expect(promote.body.errors.role).toMatch(/Only an admin/);
  });
});
