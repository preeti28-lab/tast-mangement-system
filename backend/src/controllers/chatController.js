import mongoose from "mongoose";
import Conversation, { pairKey } from "../models/Conversation.js";
import Message, { MESSAGE_MAX_LENGTH } from "../models/Message.js";
import User from "../models/User.js";
import { isSameId } from "../utils/permissions.js";

// One-to-one chat over plain REST. There is no socket: the open chat polls
// /messages?since=… every few seconds and the app shell polls /conversations
// for the unread badge and pop-ups. Each poll also refreshes the user's
// "last seen" and marks incoming messages as delivered.

/** A user counts as online when they polled within this window. */
const ONLINE_WINDOW_MS = 30 * 1000;
/** Don't write lastSeenAt more often than this. */
const SEEN_THROTTLE_MS = 15 * 1000;
const PAGE_SIZE = 40;

const USER_FIELDS = "name email role lastSeenAt";

const presence = (user, now = Date.now()) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  lastSeenAt: user.lastSeenAt ?? null,
  online: !!user.lastSeenAt && now - user.lastSeenAt.getTime() < ONLINE_WINDOW_MS,
});

const memberOf = (conversation, userId) =>
  conversation.members.find((m) => isSameId(m.user?._id ?? m.user, userId));
const otherMemberOf = (conversation, userId) =>
  conversation.members.find((m) => !isSameId(m.user?._id ?? m.user, userId));

const messageJson = (m) => ({
  _id: m._id,
  conversation: m.conversation,
  sender: m.sender,
  text: m.deleted ? "" : m.text,
  deleted: m.deleted,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
});

/** Shape of a conversation as the signed-in user sees it (members must be populated). */
function conversationJson(conversation, me, unread = 0) {
  const mine = memberOf(conversation, me._id);
  const other = otherMemberOf(conversation, me._id);
  const last = conversation.lastMessage?._id ? conversation.lastMessage : null;
  return {
    _id: conversation._id,
    user: other?.user ? presence(other.user) : null,
    lastMessage: last && {
      _id: last._id,
      sender: last.sender,
      text: last.deleted ? "" : last.text,
      deleted: !!last.deleted,
      createdAt: last.createdAt,
    },
    lastMessageAt: conversation.lastMessageAt,
    unread,
    myLastReadAt: mine?.lastReadAt ?? null,
    otherLastReadAt: other?.lastReadAt ?? null,
    otherLastDeliveredAt: other?.lastDeliveredAt ?? null,
  };
}

async function touchLastSeen(user) {
  const now = new Date();
  if (user.lastSeenAt && now - user.lastSeenAt < SEEN_THROTTLE_MS) return;
  user.lastSeenAt = now;
  await User.updateOne({ _id: user._id }, { lastSeenAt: now });
}

/** Loads a conversation the user is part of, or sends 400/404 and returns null. */
async function findOwnConversation(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: "Invalid conversation id" });
    return null;
  }
  const conversation = await Conversation.findOne({ _id: req.params.id, "members.user": req.user._id }).populate(
    "members.user",
    USER_FIELDS
  );
  if (!conversation) {
    res.status(404).json({ message: "Conversation not found" });
    return null;
  }
  return conversation;
}

const setMemberTimes = (conversationFilter, userId, fields) =>
  Conversation.updateMany(
    conversationFilter,
    { $set: Object.fromEntries(Object.entries(fields).map(([k, v]) => [`members.$[m].${k}`, v])) },
    { arrayFilters: [{ "m.user": userId }] }
  );

// GET /api/chat/conversations
// Chat list with unread counts. Polled by every open tab, so it also marks the
// user's incoming messages as delivered and keeps their "last seen" fresh.
export const listConversations = async (req, res) => {
  const me = req.user;
  const now = new Date();
  await Promise.all([
    touchLastSeen(me),
    setMemberTimes({ "members.user": me._id, lastMessageAt: { $ne: null } }, me._id, { lastDeliveredAt: now }),
  ]);

  const conversations = await Conversation.find({ "members.user": me._id, lastMessageAt: { $ne: null } })
    .sort({ lastMessageAt: -1 })
    .populate("members.user", USER_FIELDS);

  const unreadCounts = await Promise.all(
    conversations.map((c) =>
      Message.countDocuments({
        conversation: c._id,
        sender: { $ne: me._id },
        deleted: false,
        createdAt: { $gt: memberOf(c, me._id)?.lastReadAt ?? new Date(0) },
      })
    )
  );

  const list = conversations
    .map((c, i) => conversationJson(c, me, unreadCounts[i]))
    // A conversation whose other member was deleted has nobody to talk to.
    .filter((c) => c.user);
  res.json({
    conversations: list,
    unreadTotal: list.reduce((sum, c) => sum + c.unread, 0),
    // Pop-ups and desktop alerts are off when the user muted all notifications.
    notify: !me.notificationPrefs?.muteAll,
  });
};

// POST /api/chat/conversations   { userId }
// Opens (or creates) the one-to-one chat with a teammate.
export const openConversation = async (req, res) => {
  const { userId } = req.body ?? {};
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: "Choose someone to chat with" });
  }
  if (isSameId(userId, req.user._id)) {
    return res.status(400).json({ message: "You can't start a chat with yourself" });
  }
  if (!(await User.exists({ _id: userId }))) {
    return res.status(404).json({ message: "User not found" });
  }

  const key = pairKey(req.user._id, userId);
  const conversation = await Conversation.findOneAndUpdate(
    { key },
    { $setOnInsert: { key, members: [{ user: req.user._id }, { user: userId }] } },
    { upsert: true, returnDocument: "after" }
  ).populate("members.user", USER_FIELDS);
  res.json({ conversation: conversationJson(conversation, req.user) });
};

// GET /api/chat/conversations/:id/messages
//   (no query)      -> newest page
//   ?before=<iso>   -> older page, for scrolling up
//   ?since=<iso>    -> messages created or changed (deleted) at/after this time, for polling
export const listMessages = async (req, res) => {
  const conversation = await findOwnConversation(req, res);
  if (!conversation) return;
  await touchLastSeen(req.user);

  const { before, since } = req.query;
  const filter = { conversation: conversation._id };
  let messages;
  let hasMore = false;

  if (since) {
    const date = new Date(since);
    if (Number.isNaN(date.getTime())) return res.status(400).json({ message: "Invalid since" });
    messages = await Message.find({ ...filter, updatedAt: { $gte: date } }).sort({ createdAt: 1 }).limit(200);
  } else {
    if (before) {
      const date = new Date(before);
      if (Number.isNaN(date.getTime())) return res.status(400).json({ message: "Invalid before" });
      filter.createdAt = { $lt: date };
    }
    const page = await Message.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE + 1);
    hasMore = page.length > PAGE_SIZE;
    messages = page.slice(0, PAGE_SIZE).reverse();
  }

  res.json({
    messages: messages.map(messageJson),
    hasMore,
    conversation: conversationJson(conversation, req.user),
  });
};

// POST /api/chat/conversations/:id/messages   { text }
export const sendMessage = async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ message: "Message can't be empty", errors: { text: "Message can't be empty" } });
  if (text.length > MESSAGE_MAX_LENGTH) {
    const msg = `Message must be at most ${MESSAGE_MAX_LENGTH} characters`;
    return res.status(400).json({ message: msg, errors: { text: msg } });
  }

  const conversation = await findOwnConversation(req, res);
  if (!conversation) return;
  if (!otherMemberOf(conversation, req.user._id)?.user) {
    return res.status(410).json({ message: "This person is no longer on the team" });
  }

  const message = await Message.create({ conversation: conversation._id, sender: req.user._id, text });
  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: { _id: message._id, sender: req.user._id, text, deleted: false, createdAt: message.createdAt },
        lastMessageAt: message.createdAt,
        // Your own message never counts as unread for you.
        "members.$[m].lastReadAt": message.createdAt,
      },
    },
    { arrayFilters: [{ "m.user": req.user._id }] }
  );
  res.status(201).json({ message: messageJson(message) });
};

// POST /api/chat/conversations/:id/read
// Marks everything received so far as read (and delivered).
export const markConversationRead = async (req, res) => {
  const conversation = await findOwnConversation(req, res);
  if (!conversation) return;
  const now = new Date();
  await setMemberTimes({ _id: conversation._id }, req.user._id, { lastReadAt: now, lastDeliveredAt: now });
  res.json({ readAt: now });
};

// DELETE /api/chat/messages/:id
// "Delete for everyone", only for your own messages.
export const deleteMessage = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid message id" });
  }
  const message = await Message.findOne({ _id: req.params.id, sender: req.user._id });
  if (!message) return res.status(404).json({ message: "Message not found" });

  if (!message.deleted) {
    message.deleted = true;
    message.text = "";
    await message.save();
    await Conversation.updateOne(
      { _id: message.conversation, "lastMessage._id": message._id },
      { $set: { "lastMessage.deleted": true, "lastMessage.text": "" } }
    );
  }
  res.json({ message: messageJson(message) });
};
