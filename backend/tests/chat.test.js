import { registerUser, useTestDatabase } from "./helpers.js";

useTestDatabase();

async function openChat(from, to) {
  const res = await from.agent.post("/api/chat/conversations").send({ userId: to.user._id }).expect(200);
  return res.body.conversation;
}

const send = (from, chatId, text) => from.agent.post(`/api/chat/conversations/${chatId}/messages`).send({ text });

describe("chat", () => {
  test("opening a chat twice returns the same conversation, from either side", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const a = await openChat(alice, bob);
    const b = await openChat(bob, alice);
    expect(a._id).toBe(b._id);
    expect(a.user._id).toBe(bob.user._id);
    expect(b.user._id).toBe(alice.user._id);
  });

  test("can't chat with yourself or a missing user", async () => {
    const alice = await registerUser("Alice");
    await alice.agent.post("/api/chat/conversations").send({ userId: alice.user._id }).expect(400);
    await alice.agent.post("/api/chat/conversations").send({ userId: "64b000000000000000000000" }).expect(404);
    await alice.agent.post("/api/chat/conversations").send({ userId: "nope" }).expect(400);
  });

  test("empty chats stay out of the list until a message is sent", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const chat = await openChat(alice, bob);
    expect((await alice.agent.get("/api/chat/conversations")).body.conversations).toHaveLength(0);

    await send(alice, chat._id, "Hi Bob").expect(201);
    const list = (await bob.agent.get("/api/chat/conversations")).body;
    expect(list.conversations).toHaveLength(1);
    expect(list.conversations[0].lastMessage.text).toBe("Hi Bob");
    expect(list.conversations[0].user.name).toMatch(/^Alice/);
  });

  test("unread counts, read receipts and delivery", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const chat = await openChat(alice, bob);
    await send(alice, chat._id, "one").expect(201);
    await send(alice, chat._id, "two").expect(201);

    // The sender's own messages are never unread for them.
    expect((await alice.agent.get("/api/chat/conversations")).body.unreadTotal).toBe(0);

    const bobList = (await bob.agent.get("/api/chat/conversations")).body;
    expect(bobList.unreadTotal).toBe(2);
    expect(bobList.conversations[0].unread).toBe(2);

    // Bob's poll marked the messages delivered; Alice sees it, but not read yet.
    const seen = (await alice.agent.get(`/api/chat/conversations/${chat._id}/messages`)).body.conversation;
    expect(new Date(seen.otherLastDeliveredAt) >= new Date(seen.lastMessage.createdAt)).toBe(true);
    expect(new Date(seen.otherLastReadAt) < new Date(seen.lastMessage.createdAt)).toBe(true);

    await bob.agent.post(`/api/chat/conversations/${chat._id}/read`).expect(200);
    expect((await bob.agent.get("/api/chat/conversations")).body.unreadTotal).toBe(0);
    const read = (await alice.agent.get(`/api/chat/conversations/${chat._id}/messages`)).body.conversation;
    expect(new Date(read.otherLastReadAt) >= new Date(read.lastMessage.createdAt)).toBe(true);
  });

  test("polling with ?since returns only new or changed messages", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const chat = await openChat(alice, bob);
    const first = (await send(alice, chat._id, "first").expect(201)).body.message;
    const cursor = new Date(new Date(first.updatedAt).getTime() + 1).toISOString();
    await new Promise((r) => setTimeout(r, 5));
    await send(bob, chat._id, "second").expect(201);

    const { body } = await alice.agent.get(`/api/chat/conversations/${chat._id}/messages?since=${cursor}`).expect(200);
    expect(body.messages.map((m) => m.text)).toEqual(["second"]);
  });

  test("history pages from newest to oldest", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const chat = await openChat(alice, bob);
    for (let i = 1; i <= 45; i++) await send(i % 2 ? alice : bob, chat._id, `m${i}`).expect(201);

    const page1 = (await alice.agent.get(`/api/chat/conversations/${chat._id}/messages`)).body;
    expect(page1.messages).toHaveLength(40);
    expect(page1.hasMore).toBe(true);
    expect(page1.messages.at(-1).text).toBe("m45");

    const before = page1.messages[0].createdAt;
    const page2 = (await alice.agent.get(`/api/chat/conversations/${chat._id}/messages?before=${before}`)).body;
    expect(page2.messages.map((m) => m.text)).toEqual(["m1", "m2", "m3", "m4", "m5"]);
    expect(page2.hasMore).toBe(false);
  });

  test("outsiders can't read or post in someone else's chat", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const eve = await registerUser("Eve");
    const chat = await openChat(alice, bob);
    await send(alice, chat._id, "secret").expect(201);

    await eve.agent.get(`/api/chat/conversations/${chat._id}/messages`).expect(404);
    await send(eve, chat._id, "hi").expect(404);
    await eve.agent.post(`/api/chat/conversations/${chat._id}/read`).expect(404);
  });

  test("validates message text", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const chat = await openChat(alice, bob);
    await send(alice, chat._id, "   ").expect(400);
    await send(alice, chat._id, "x".repeat(2001)).expect(400);
    const ok = await send(alice, chat._id, "  trimmed  ").expect(201);
    expect(ok.body.message.text).toBe("trimmed");
  });

  test("only the sender can delete a message, and it's wiped for everyone", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const chat = await openChat(alice, bob);
    const msg = (await send(alice, chat._id, "oops").expect(201)).body.message;

    await bob.agent.delete(`/api/chat/messages/${msg._id}`).expect(404);
    const del = await alice.agent.delete(`/api/chat/messages/${msg._id}`).expect(200);
    expect(del.body.message).toMatchObject({ deleted: true, text: "" });

    const bobView = (await bob.agent.get(`/api/chat/conversations/${chat._id}/messages`)).body;
    expect(bobView.messages[0]).toMatchObject({ deleted: true, text: "" });
    const list = (await bob.agent.get("/api/chat/conversations")).body;
    expect(list.conversations[0].lastMessage).toMatchObject({ deleted: true, text: "" });
    // A deleted message no longer counts as unread.
    expect(list.unreadTotal).toBe(0);
  });

  test("deleting a member removes their chats", async () => {
    const admin = await registerUser("Admin"); // first account becomes admin
    const bob = await registerUser("Bob");
    const chat = await openChat(admin, bob);
    await send(bob, chat._id, "bye").expect(201);
    expect((await admin.agent.get("/api/chat/conversations")).body.conversations).toHaveLength(1);

    await admin.agent.delete(`/api/users/${bob.user._id}`).expect(200);
    expect((await admin.agent.get("/api/chat/conversations")).body.conversations).toHaveLength(0);
    await admin.agent.get(`/api/chat/conversations/${chat._id}/messages`).expect(404);
  });

  test("polling the chat list marks the user online", async () => {
    const alice = await registerUser("Alice");
    const bob = await registerUser("Bob");
    const chat = await openChat(alice, bob);
    await send(alice, chat._id, "hey").expect(201);
    await bob.agent.get("/api/chat/conversations").expect(200);

    const { conversation } = (await alice.agent.get(`/api/chat/conversations/${chat._id}/messages`)).body;
    expect(conversation.user.online).toBe(true);
    expect(conversation.user.lastSeenAt).toBeTruthy();
  });
});
