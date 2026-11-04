import { Router } from "express";
import {
  getComments,
  createComment,
  reactToComment,
  deleteComment,
} from "../controllers/comments.controller.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { validateCommentMiddleware } from "../middleware/spamFilter.js";
import { commentLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.get("/", getComments);
router.post("/", commentLimiter, validateCommentMiddleware, createComment);
router.post("/:id/react", reactToComment);
router.delete("/:id", requireAdminAuth, deleteComment);

export default router;
