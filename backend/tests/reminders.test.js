import { registerUser, useTestDatabase } from "./helpers.js";
import { sendDueReminders } from "../src/services/reminderService.js";

useTestDatabase();

const inMinutes = (m) => new Date(Date.now() + m * 60_000).toISOString();

describe("due-date reminders", () => {
  test("reminds the assignee once when a task is due within the hour", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    await alice.agent
      .post("/api/tasks")
      .send({ title: "Ship report", dueDate: inMinutes(45), assignedTo: bob.user._id })
      .expect(201);
    await alice.agent.post("/api/tasks").send({ title: "Later", dueDate: inMinutes(180) }).expect(201);

    expect(await sendDueReminders()).toBe(1);
    expect(await sendDueReminders()).toBe(0); // never twice

    const { body } = await bob.agent.get("/api/notifications").expect(200);
    const reminder = body.notifications.find((n) => n.type === "task_reminder");
    expect(reminder.message).toMatch(/"Ship report" is due in 45 minutes/);
    const own = await alice.agent.get("/api/notifications").expect(200);
    expect(own.body.notifications.some((n) => n.type === "task_reminder")).toBe(false);
  });

  test("unassigned tasks remind the creator; completed tasks are skipped", async () => {
    const alice = await registerUser("Solo");
    await alice.agent.post("/api/tasks").send({ title: "Mine", dueDate: inMinutes(30) }).expect(201);
    await alice.agent.post("/api/tasks").send({ title: "Done", dueDate: inMinutes(30), status: "completed" }).expect(201);

    expect(await sendDueReminders()).toBe(1);
    const { body } = await alice.agent.get("/api/notifications").expect(200);
    expect(body.notifications.map((n) => n.message)).toEqual([expect.stringContaining('"Mine"')]);
  });

  test("moving the due date re-arms the reminder", async () => {
    const alice = await registerUser("Moves");
    const { body } = await alice.agent.post("/api/tasks").send({ title: "Moving", dueDate: inMinutes(20) }).expect(201);
    expect(await sendDueReminders()).toBe(1);

    await alice.agent.patch(`/api/tasks/${body.task._id}`).send({ dueDate: inMinutes(50) }).expect(200);
    expect(await sendDueReminders()).toBe(1);
  });

  test("respects the in-app reminder preference", async () => {
    const alice = await registerUser("Quiet");
    await alice.agent.put("/api/users/me/preferences").send({ inApp: { dueReminder: false } }).expect(200);
    await alice.agent.post("/api/tasks").send({ title: "Muted", dueDate: inMinutes(10) }).expect(201);
    expect(await sendDueReminders()).toBe(0);
  });
});
