import { registerUser, useTestDatabase } from "./helpers.js";

useTestDatabase();

const unread = async (agent) => (await agent.get("/api/notifications")).body.unreadCount;

describe("notifications", () => {
  test("assigning a task notifies the assignee (but not when assigning yourself)", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");

    await alice.agent.post("/api/tasks").send({ title: "Self", assignedTo: alice.user._id });
    expect(await unread(alice.agent)).toBe(0);

    await alice.agent.post("/api/tasks").send({ title: "Review PR", assignedTo: bob.user._id });
    const { body } = await bob.agent.get("/api/notifications");
    expect(body.unreadCount).toBe(1);
    expect(body.notifications[0].message).toMatch(/Alice\d* assigned you a task: "Review PR"/);
  });

  test("status changes notify the creator", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const { body } = await alice.agent.post("/api/tasks").send({ title: "T", assignedTo: bob.user._id });
    await bob.agent.patch(`/api/tasks/${body.task._id}`).send({ status: "completed" });
    const list = await alice.agent.get("/api/notifications");
    expect(list.body.notifications[0].message).toMatch(/marked "T" as Completed/);
  });

  test("users can only mark their own notifications as read", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    await alice.agent.post("/api/tasks").send({ title: "T", assignedTo: bob.user._id });
    const [notification] = (await bob.agent.get("/api/notifications")).body.notifications;

    await alice.agent.patch(`/api/notifications/${notification._id}/read`).expect(404);
    await bob.agent.patch(`/api/notifications/${notification._id}/read`).expect(200);
    expect(await unread(bob.agent)).toBe(0);
  });

  describe("preferences", () => {
    test("defaults: in-app on, email off", async () => {
      const alice = await registerUser("Alice");
      const { body } = await alice.agent.get("/api/users/me/preferences").expect(200);
      expect(body.preferences).toMatchObject({
        muteAll: false,
        inApp: { taskAssigned: true, taskUpdated: true },
        email: { taskAssigned: false, taskUpdated: false },
      });
      expect(body.emailAvailable).toBe(false);
    });

    test("turning off in-app assignment alerts stops those notifications", async () => {
      const alice = await registerUser("Alice");
      const bob = await registerUser("Bob");
      await bob.agent.put("/api/users/me/preferences").send({ inApp: { taskAssigned: false } }).expect(200);

      const { body } = await alice.agent.post("/api/tasks").send({ title: "T", assignedTo: bob.user._id });
      expect(await unread(bob.agent)).toBe(0);

      // Status updates are still delivered.
      await alice.agent.patch(`/api/tasks/${body.task._id}`).send({ status: "in_progress" });
      expect(await unread(bob.agent)).toBe(1);
    });

    test("mute all silences everything", async () => {
      const alice = await registerUser("Alice");
      const bob = await registerUser("Bob");
      await bob.agent.put("/api/users/me/preferences").send({ muteAll: true }).expect(200);
      const { body } = await alice.agent.post("/api/tasks").send({ title: "T", assignedTo: bob.user._id });
      await alice.agent.patch(`/api/tasks/${body.task._id}`).send({ status: "completed" });
      expect(await unread(bob.agent)).toBe(0);
    });

    test("rejects non-boolean values", async () => {
      const alice = await registerUser("Alice");
      await alice.agent.put("/api/users/me/preferences").send({ muteAll: "yes" }).expect(400);
      await alice.agent.put("/api/users/me/preferences").send({}).expect(400);
    });
  });
});
