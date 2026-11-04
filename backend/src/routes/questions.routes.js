import { Router } from "express";
import {
  getQuestions,
  getAdminQuestions,
  createQuestion,
  reactToQuestion,
  reactToAnswer,
  incrementView,
  updateQuestion,
  deleteQuestion,
} from "../controllers/questions.controller.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { validateQuestionMiddleware } from "../middleware/spamFilter.js";
import { questionLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.get("/", getQuestions);
router.get("/admin", requireAdminAuth, getAdminQuestions);
router.post("/", questionLimiter, validateQuestionMiddleware, createQuestion);
router.post("/:id/react", reactToQuestion);
router.post("/:id/react-answer", reactToAnswer);
router.post("/:id/view", incrementView);
router.patch("/:id", requireAdminAuth, updateQuestion);
router.delete("/:id", requireAdminAuth, deleteQuestion);

export default router;
