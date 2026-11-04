import { Router } from "express";
import { handleWebhook } from "../controllers/telegram.controller.js";

const router = Router();

router.post("/webhook", handleWebhook);

export default router;
