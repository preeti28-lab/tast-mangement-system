import { Router } from "express";
import {
  listUsers,
  updateRole,
  getPreferences,
  updatePreferences,
  updateProfile,
  changePassword,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { protect, requirePermission } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/", listUsers);
router.get("/me/preferences", getPreferences);
router.put("/me/preferences", updatePreferences);
router.patch("/me", updateProfile);
router.put("/me/password", changePassword);
router.post("/", requirePermission("users.manage"), createUser);
router.patch("/:id/role", requirePermission("users.manage"), updateRole);
router.patch("/:id", requirePermission("users.manage"), updateUser);
router.delete("/:id", requirePermission("users.manage"), deleteUser);

export default router;
