import { Router } from "express";
import { register, login, logout, me, socketToken } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, me);
router.get("/socket-token", protect, socketToken);

export default router;
