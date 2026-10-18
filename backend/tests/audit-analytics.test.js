import mongoose from "mongoose";
import { daysFromNow, registerUser, setRole, useTestDatabase } from "./helpers.js";

useTestDatabase();

describe("audit log", () => {
  test("records task actions with field-level changes", async () => {
    const alice = await registerUser("Alice"); // admin
    const bob = await registerUser("Bob");
    const { body } = await alice.agent.post("/api/tasks").send({ title: "T", assignedTo: bob.user._id });
    const id = body.task._id;
    await alice.agent.patch(`/api/tasks/${id}`).send({ priority: "high" });
    await bob.agent.patch(`/api/tasks/${id}`).send({ status: "completed" });
    await alice.agent.delete(`/api/tasks/${id}`);

    const { body: log } = await alice.agent.get(`/api/audit-logs?task=${id}`).expect(200);
    expect(log.logs.map((l) => l.action).reverse()).toEqual([
      "task.created",
      "task.assigned",
      "task.updated",
      "task.status_changed",
      "task.deleted",
    ]);
    const updated = log.logs.find((l) => l.action === "task.updated");
    expect(updated.changes).toEqual([{ field: "priority", from: "medium", to: "high" }]);
    expect(log.logs.find((l) => l.action === "task.status_changed").actor.name).toMatch(/^Bob/);
  });

  test("regular users only see entries for their own tasks; staff see everything", async () => {
    await registerUser("Admin");
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    await alice.agent.post("/api/tasks").send({ title: "Alice private" });

    const bobLog = await bob.agent.get("/api/audit-logs");
    expect(bobLog.body.logs.every((l) => l.taskTitle !== "Alice private")).toBe(true);

    await setRole(bob.user._id, "manager");
    const managerLog = await bob.agent.get("/api/audit-logs?action=task.created");
    expect(managerLog.body.logs.map((l) => l.taskTitle)).toContain("Alice private");
  });

  test("role changes are logged", async () => {
    const admin = await registerUser("Admin");
    const bob = await registerUser("Bob");
    await admin.agent.patch(`/api/users/${bob.user._id}/role`).send({ role: "manager" });
    const { body } = await admin.agent.get("/api/audit-logs?action=user.role_changed");
    expect(body.logs[0].changes).toEqual([{ field: "role", from: "user", to: "manager" }]);
  });
});

describe("analytics", () => {
  test("personal summary, status breakdown and trend", async () => {
    const alice = await registerUser("Alice");
    const make = (body) => alice.agent.post("/api/tasks").send(body).expect(201);
    await make({ title: "Done", status: "completed" });
    await make({ title: "Late", dueDate: daysFromNow(-1) });
    await make({ title: "Open", priority: "high" });
    await make({ title: "Doing", status: "in_progress" });

    const { body } = await alice.agent.get("/api/analytics").expect(200);
    expect(body.scope).toBe("me");
    expect(body.summary).toMatchObject({ total: 4, completed: 1, open: 3, overdue: 1, completionRate: 25 });
    expect(body.byStatus).toEqual({ todo: 2, in_progress: 1, completed: 1 });
    expect(body.cohorts).toHaveLength(6);
    const thisWeekCohort = body.cohorts.at(-1);
    expect(thisWeekCohort.size).toBe(4);
    expect(thisWeekCohort.values[0]).toBe(25);
    expect(thisWeekCohort.values.slice(1)).toEqual([null, null, null, null, null]);
    expect(body.byPriority.high).toBe(1);
    expect(body.trend).toHaveLength(8);
    expect(body.trend.at(-1)).toMatchObject({ created: 4, completed: 1, overdue: 1 });
  });

  test("overdue trend uses completion time: a task finished late counts as overdue before it was finished", async () => {
    const alice = await registerUser("Alice");
    const { body } = await alice.agent.post("/api/tasks").send({ title: "Old" }).expect(201);
    // Backdate: created 3 weeks ago, due 2 weeks ago, completed 1 day ago.
    await mongoose.connection.collection("tasks").updateOne(
      { _id: new mongoose.Types.ObjectId(body.task._id) },
      {
        $set: {
          createdAt: new Date(daysFromNow(-21)),
          dueDate: new Date(daysFromNow(-14)),
          status: "completed",
          completedAt: new Date(daysFromNow(-1)),
        },
      }
    );
    const { body: analytics } = await alice.agent.get("/api/analytics");
    expect(analytics.summary.overdue).toBe(0);
    expect(analytics.trend.at(-2).overdue).toBe(1);
    expect(analytics.summary.onTimeRate).toBe(0);
  });

  test("team analytics are for staff only and include per-user stats", async () => {
    const admin = await registerUser("Admin");
    const bob = await registerUser("Bob");
    await bob.agent.get("/api/analytics?scope=team").expect(403);

    await admin.agent.post("/api/tasks").send({ title: "A", assignedTo: bob.user._id, status: "completed" });
    await admin.agent.post("/api/tasks").send({ title: "B", assignedTo: bob.user._id });
    const { body } = await admin.agent.get("/api/analytics?scope=team").expect(200);
    const bobStats = body.perUser.find((p) => p.user._id === bob.user._id);
    expect(bobStats).toMatchObject({ assigned: 2, completed: 1, completionRate: 50, onTime: 0 });
    expect(bobStats.weeklyCompleted).toHaveLength(6);
    expect(bobStats.weeklyCompleted.at(-1)).toBe(1);
    // Ranked by completed tasks, so Bob (the only one with a completion) is first.
    expect(body.perUser[0].user._id).toBe(bob.user._id);
  });
});

describe("dashboard top performers", () => {
  test("ranks assignees by completed tasks, top 3, visible to regular users", async () => {
    const admin = await registerUser("Admin");
    const users = await Promise.all(["Ann", "Ben", "Cat", "Dan"].map((n) => registerUser(n)));
    const assign = (u, body) =>
      admin.agent.post("/api/tasks").send({ title: "T", assignedTo: u.user._id, ...body }).expect(201);

    // Ann: 3 done (1 on time), Ben: 1 done + 1 open, Cat: 2 done, Dan: nothing done.
    await assign(users[0], { status: "completed", dueDate: daysFromNow(2) });
    await assign(users[0], { status: "completed" });
    await assign(users[0], { status: "completed" });
    await assign(users[1], { status: "completed" });
    await assign(users[1], {});
    await assign(users[2], { status: "completed" });
    await assign(users[2], { status: "completed" });
    await assign(users[3], {});

    const { body } = await users[3].agent.get("/api/dashboard").expect(200);
    expect(body.topPerformers.map((r) => r.user.name)).toEqual(["Ann", "Cat", "Ben"]);
    expect(body.topPerformers[0]).toMatchObject({ completed: 3, assigned: 3, onTime: 1, completionRate: 100 });
    expect(body.topPerformers[2]).toMatchObject({ completed: 1, assigned: 2, completionRate: 50 });
    expect(body.topPerformers[0].user.password).toBeUndefined();
  });
});

describe("dashboard activity", () => {
  test("returns weekly trend, status/priority mix and upcoming deadlines for the user", async () => {
    const alice = await registerUser("Alice");
    await alice.agent.post("/api/tasks").send({ title: "Soon", dueDate: daysFromNow(2), priority: "high" }).expect(201);
    await alice.agent.post("/api/tasks").send({ title: "Later", dueDate: daysFromNow(20) }).expect(201);
    await alice.agent.post("/api/tasks").send({ title: "Done", status: "completed" }).expect(201);

    const { body } = await alice.agent.get("/api/dashboard").expect(200);
    expect(body.trend).toHaveLength(8);
    expect(body.trend.at(-1)).toMatchObject({ created: 3, completed: 1 });
    expect(body.byStatus).toEqual({ todo: 2, in_progress: 0, completed: 1 });
    expect(body.byPriority.high).toBe(1);
    expect(body.upcomingTasks.map((t) => t.title)).toEqual(["Soon"]);
  });
});
