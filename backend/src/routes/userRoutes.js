import { Router } from "express";
import {
  listUsers,
  updateRole,
  getPreferences,
  updatePreferences,
  updateProfile,
  changePassword,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/", listUsers);
router.get("/me/preferences", getPreferences);
router.put("/me/preferences", updatePreferences);
router.patch("/me", updateProfile);
router.put("/me/password", changePassword);
router.patch("/:id/role", authorize("admin"), updateRole);

export default router;
