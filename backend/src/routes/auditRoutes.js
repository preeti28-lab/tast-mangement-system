import { Router } from "express";
import { listAuditLogs } from "../controllers/auditController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, listAuditLogs);

export default router;
