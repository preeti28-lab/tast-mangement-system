import { daysFromNow, registerUser, setRole, useTestDatabase } from "./helpers.js";

useTestDatabase();

async function team() {
  const admin = await registerUser("Admin"); // first user -> admin
  const alice = await registerUser("Alice");
  const bob = await registerUser("Bob");
  const carol = await registerUser("Carol");
  return { admin, alice, bob, carol };
}

describe("task CRUD", () => {
  test("creates, reads, updates and deletes a task", async () => {
    const { alice } = await team();
    const created = await alice.agent
      .post("/api/tasks")
      .send({ title: "Write docs", description: "README", priority: "high", dueDate: daysFromNow(2) })
      .expect(201);
    const id = created.body.task._id;
    expect(created.body.task).toMatchObject({ title: "Write docs", status: "todo", priority: "high" });

    await alice.agent.get(`/api/tasks/${id}`).expect(200);
    const updated = await alice.agent.patch(`/api/tasks/${id}`).send({ title: "Write better docs" }).expect(200);
    expect(updated.body.task.title).toBe("Write better docs");

    await alice.agent.delete(`/api/tasks/${id}`).expect(200);
    await alice.agent.get(`/api/tasks/${id}`).expect(404);
  });

  test("validates input", async () => {
    const { alice } = await team();
    const res = await alice.agent
      .post("/api/tasks")
      .send({ title: " ", priority: "urgent", status: "x", dueDate: "nope", assignedTo: "123" })
      .expect(400);
    expect(Object.keys(res.body.errors).sort()).toEqual(["assignedTo", "dueDate", "priority", "status", "title"]);

    const missingUser = await alice.agent
      .post("/api/tasks")
      .send({ title: "x", assignedTo: "64b7f0000000000000000000" })
      .expect(400);
    expect(missingUser.body.errors.assignedTo).toMatch(/does not exist/);
  });

  test("sets and clears completedAt with the status", async () => {
    const { alice } = await team();
    const { body } = await alice.agent.post("/api/tasks").send({ title: "Ship" }).expect(201);
    const done = await alice.agent.patch(`/api/tasks/${body.task._id}`).send({ status: "completed" });
    expect(done.body.task.completedAt).toBeTruthy();
    const reopened = await alice.agent.patch(`/api/tasks/${body.task._id}`).send({ status: "todo" });
    expect(reopened.body.task.completedAt).toBeNull();
  });
});

describe("role-based access control", () => {
  test("regular users only see tasks they created or are assigned to", async () => {
    const { alice, bob, carol } = await team();
    const { body } = await alice.agent
      .post("/api/tasks")
      .send({ title: "For Bob", assignedTo: bob.user._id })
      .expect(201);

    await bob.agent.get(`/api/tasks/${body.task._id}`).expect(200);
    await carol.agent.get(`/api/tasks/${body.task._id}`).expect(404);
    const list = await carol.agent.get("/api/tasks").expect(200);
    expect(list.body.total).toBe(0);
    await carol.agent.get("/api/tasks?view=team").expect(403);
  });

  test("the assignee can change only the status", async () => {
    const { alice, bob } = await team();
    const { body } = await alice.agent.post("/api/tasks").send({ title: "T", assignedTo: bob.user._id });
    await bob.agent.patch(`/api/tasks/${body.task._id}`).send({ title: "hacked" }).expect(403);
    await bob.agent.patch(`/api/tasks/${body.task._id}`).send({ status: "in_progress" }).expect(200);
    await bob.agent.delete(`/api/tasks/${body.task._id}`).expect(403);
  });

  test("managers see and edit all tasks but only delete their own", async () => {
    const { alice, carol } = await team();
    await setRole(carol.user._id, "manager");
    const { body } = await alice.agent.post("/api/tasks").send({ title: "Alice's task" });

    const teamList = await carol.agent.get("/api/tasks?view=team").expect(200);
    expect(teamList.body.tasks.map((t) => t.title)).toContain("Alice's task");
    await carol.agent.patch(`/api/tasks/${body.task._id}`).send({ priority: "high" }).expect(200);
    await carol.agent.delete(`/api/tasks/${body.task._id}`).expect(403);
  });

  test("admins can delete any task", async () => {
    const { admin, alice } = await team();
    const { body } = await alice.agent.post("/api/tasks").send({ title: "Alice's task" });
    await admin.agent.delete(`/api/tasks/${body.task._id}`).expect(200);
  });

  test("only admins can change roles, and not their own", async () => {
    const { admin, alice, bob } = await team();
    await alice.agent.patch(`/api/users/${bob.user._id}/role`).send({ role: "admin" }).expect(403);
    await admin.agent.patch(`/api/users/${admin.user._id}/role`).send({ role: "user" }).expect(400);
    await admin.agent.patch(`/api/users/${bob.user._id}/role`).send({ role: "boss" }).expect(400);
    const res = await admin.agent.patch(`/api/users/${bob.user._id}/role`).send({ role: "manager" }).expect(200);
    expect(res.body.user.role).toBe("manager");
  });
});

describe("search, filters and views", () => {
  async function seed(agent, bobId) {
    const make = (body) => agent.post("/api/tasks").send(body).expect(201);
    await make({ title: "Quarterly report", description: "numbers", priority: "high", dueDate: daysFromNow(-2) });
    await make({ title: "Fix login bug", priority: "low", dueDate: daysFromNow(3), assignedTo: bobId });
    await make({ title: "Plan sprint", status: "completed", dueDate: daysFromNow(-5) });
    await make({ title: "No due date" });
  }

  test("searches title and description, case-insensitively, with regex chars escaped", async () => {
    const { alice, bob } = await team();
    await seed(alice.agent, bob.user._id);
    const byDescription = await alice.agent.get("/api/tasks?search=NUMBERS");
    expect(byDescription.body.tasks.map((t) => t.title)).toEqual(["Quarterly report"]);
    const regex = await alice.agent.get("/api/tasks?search=.*(").expect(200);
    expect(regex.body.total).toBe(0);
  });

  test("filters by status, priority and due date range", async () => {
    const { alice, bob } = await team();
    await seed(alice.agent, bob.user._id);
    const titles = async (qs) => (await alice.agent.get(`/api/tasks?${qs}`)).body.tasks.map((t) => t.title);

    expect(await titles("status=completed")).toEqual(["Plan sprint"]);
    expect(await titles("priority=low")).toEqual(["Fix login bug"]);
    expect(await titles(`dueFrom=${daysFromNow(0)}&dueTo=${daysFromNow(7)}`)).toEqual(["Fix login bug"]);
  });

  test("overdue view excludes completed tasks; due-date sort puts undated tasks last", async () => {
    const { alice, bob } = await team();
    await seed(alice.agent, bob.user._id);
    const overdue = await alice.agent.get("/api/tasks?view=overdue");
    expect(overdue.body.tasks.map((t) => t.title)).toEqual(["Quarterly report"]);

    const sorted = await alice.agent.get("/api/tasks?sort=due_asc");
    expect(sorted.body.tasks.at(-1).title).toBe("No due date");
  });

  test("assigned/created views and pagination", async () => {
    const { alice, bob } = await team();
    await seed(alice.agent, bob.user._id);
    const assigned = await bob.agent.get("/api/tasks?view=assigned");
    expect(assigned.body.tasks.map((t) => t.title)).toEqual(["Fix login bug"]);

    const page2 = await alice.agent.get("/api/tasks?view=created&limit=3&page=2");
    expect(page2.body).toMatchObject({ total: 4, page: 2, pages: 2 });
    expect(page2.body.tasks).toHaveLength(1);
  });

  test("rejects invalid filter values", async () => {
    const { alice } = await team();
    await alice.agent.get("/api/tasks?view=nope").expect(400);
    await alice.agent.get("/api/tasks?status=nope").expect(400);
    await alice.agent.get("/api/tasks?dueFrom=nope").expect(400);
  });
});
