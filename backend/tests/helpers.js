import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import app from "../src/app.js";

let replSet;

/** Starts an in-memory MongoDB replica set (replica set = change streams work). */
export function useTestDatabase() {
  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGODB_URI = replSet.getUri("taskflow_test");
  });

  afterEach(async () => {
    if (mongoose.connection.readyState !== 1) return; // test never touched the DB
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet?.stop();
  });
}

let counter = 0;

/** Registers a user and returns a supertest agent that keeps the auth cookie. */
export async function registerUser(name = "User", overrides = {}) {
  const agent = request.agent(app);
  counter += 1;
  const body = {
    name,
    email: `${name.toLowerCase().replace(/\s+/g, "")}${counter}@example.com`,
    password: "password123",
    ...overrides,
  };
  const res = await agent.post("/api/auth/register").send(body).expect(201);
  return { agent, user: res.body.user, password: body.password };
}

/** Sets a user's role directly in the database (role changes are admin-only via the API). */
export async function setRole(userId, role) {
  await mongoose.connection.collection("users").updateOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    { $set: { role } }
  );
}

export const daysFromNow = (days) => new Date(Date.now() + days * 864e5).toISOString();

export { app, request };
