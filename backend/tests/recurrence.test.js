import { nextDueDate } from "../src/utils/recurrence.js";
import { daysFromNow, registerUser, useTestDatabase } from "./helpers.js";

useTestDatabase();

describe("nextDueDate", () => {
  const at = (iso) => new Date(iso);

  test("daily / weekly", () => {
    expect(nextDueDate(at("2026-03-10T18:29:59Z"), "daily").toISOString()).toBe("2026-03-11T18:29:59.000Z");
    expect(nextDueDate(at("2026-03-10T18:29:59Z"), "weekly").toISOString()).toBe("2026-03-17T18:29:59.000Z");
  });

  test("monthly clamps to the end of shorter months", () => {
    expect(nextDueDate(at("2026-01-31T10:00:00Z"), "monthly").toISOString()).toBe("2026-02-28T10:00:00.000Z");
    expect(nextDueDate(at("2026-12-15T10:00:00Z"), "monthly").toISOString()).toBe("2027-01-15T10:00:00.000Z");
  });

  test("none returns null", () => {
    expect(nextDueDate(new Date(), "none")).toBeNull();
  });
});

describe("recurring tasks", () => {
  test("need a due date", async () => {
    const alice = await registerUser("Alice");
    await alice.agent.post("/api/tasks").send({ title: "Standup", recurrence: "daily" }).expect(400);
  });

  test("completing one creates the next occurrence exactly once", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const due = daysFromNow(1);
    const { body } = await alice.agent
      .post("/api/tasks")
      .send({ title: "Weekly report", recurrence: "weekly", dueDate: due, assignedTo: bob.user._id })
      .expect(201);

    const done = await bob.agent.patch(`/api/tasks/${body.task._id}`).send({ status: "completed" }).expect(200);
    const next = done.body.nextOccurrence;
    expect(next).toMatchObject({ title: "Weekly report", status: "todo", recurrence: "weekly" });
    expect(new Date(next.dueDate) - new Date(due)).toBe(7 * 864e5);
    expect(next.assignedTo._id).toBe(bob.user._id);

    // Re-opening and completing again must not create a duplicate.
    await bob.agent.patch(`/api/tasks/${body.task._id}`).send({ status: "todo" });
    const again = await bob.agent.patch(`/api/tasks/${body.task._id}`).send({ status: "completed" });
    expect(again.body.nextOccurrence).toBeUndefined();

    const all = await alice.agent.get("/api/tasks?search=Weekly");
    expect(all.body.total).toBe(2);
  });
});
