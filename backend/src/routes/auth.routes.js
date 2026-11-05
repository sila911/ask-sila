import { Router } from "express";
import {
  login,
  verify2fa,
  requestOtp,
  getMe,
  logout,
  resetPassword,
  forgotPassword,
  verifyResetOtp,
} from "../controllers/auth.controller.js";
import { requireAdminAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/login", authLimiter, login);
router.post("/verify-2fa", authLimiter, verify2fa);
router.post("/request-otp", authLimiter, requestOtp);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/verify-reset-otp", authLimiter, verifyResetOtp);
router.get("/me", requireAdminAuth, getMe);
router.post("/logout", logout);
router.post("/reset-password", authLimiter, resetPassword);

export default router;
