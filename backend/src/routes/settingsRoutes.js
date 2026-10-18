import { Router } from "express";
import { getAccess, updateAccess } from "../controllers/settingsController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

// Only admins tune role access, whatever the matrix says (so it can't lock them out).
router.use(protect, authorize("admin"));
router.get("/access", getAccess);
router.put("/access", updateAccess);

export default router;
