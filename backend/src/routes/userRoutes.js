import { Router } from "express";
import {
  listUsers,
  updateRole,
  getPreferences,
  updatePreferences,
} from "../controllers/userController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/", listUsers);
router.get("/me/preferences", getPreferences);
router.put("/me/preferences", updatePreferences);
router.patch("/:id/role", authorize("admin"), updateRole);

export default router;
