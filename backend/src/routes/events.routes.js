import { Router } from "express";
import { getEvents, createEvent } from "../controllers/events.controller.js";
import { requireAdminAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAdminAuth, getEvents);
router.post("/", createEvent);

export default router;
