import { Router } from "express";
import {
  deleteMessage,
  listConversations,
  listMessages,
  markConversationRead,
  openConversation,
  sendMessage,
} from "../controllers/chatController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.route("/conversations").get(listConversations).post(openConversation);
router.route("/conversations/:id/messages").get(listMessages).post(sendMessage);
router.post("/conversations/:id/read", markConversationRead);
router.delete("/messages/:id", deleteMessage);

export default router;
