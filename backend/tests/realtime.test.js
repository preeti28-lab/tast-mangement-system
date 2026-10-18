import http from "node:http";
import { io as connect } from "socket.io-client";
import { app, registerUser, useTestDatabase } from "./helpers.js";
import connectDB from "../src/config/db.js";
import { attachSocketServer } from "../src/realtime/socketServer.js";

useTestDatabase();

let server;
let url;

beforeAll(async () => {
  await connectDB();
  server = http.createServer(app);
  const io = attachSocketServer(server);
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}`;
  server.io = io;
});

afterAll(async () => {
  server.io.close();
  await new Promise((resolve) => server.close(resolve));
});

const waitFor = (socket, event) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), 10000);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

async function connectAs(agent) {
  const { body } = await agent.get("/api/auth/socket-token").expect(200);
  const socket = connect(url, { auth: { token: body.token }, transports: ["websocket"] });
  await waitFor(socket, "connect");
  return socket;
}

describe("Socket.io realtime notifications", () => {
  test("rejects connections without a valid socket token", async () => {
    const socket = connect(url, { auth: { token: "bad" }, transports: ["websocket"] });
    const error = await waitFor(socket, "connect_error");
    expect(error.message).toBe("Unauthorized");
    socket.close();
  });

  test("pushes a notification to the assignee as soon as a task is assigned", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const socket = await connectAs(bob.agent);

    const received = waitFor(socket, "notification");
    const changed = waitFor(socket, "task:changed");
    await alice.agent.post("/api/tasks").send({ title: "Live task", assignedTo: bob.user._id }).expect(201);

    const notification = await received;
    expect(notification.message).toMatch(/assigned you a task: "Live task"/);
    expect(notification.task.title).toBe("Live task");
    expect((await changed).op).toBe("insert");
    socket.close();
  });
});
