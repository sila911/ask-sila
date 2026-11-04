import { useState, useEffect } from "react";
import {
  verifyOrSetupPassword,
  requestTelegramOtp,
  verifyTelegramOtp,
  logoutAdmin,
  is2FAVerified,
  set2FAVerified,
  clear2FAVerified,
  hasAdminPassword,
} from "../lib/adminAccess";

/**
 * Manages admin authentication state, 2FA verification, and backend auth checks.
 */
export function useAdminAuth() {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    // Check existing session and 2FA verification on mount
    hasAdminPassword()
      .then((authenticated) => {
        if (authenticated && is2FAVerified()) {
          setIsAdminUnlocked(true);
        } else {
          setIsAdminUnlocked(false);
        }
        setIsAuthChecking(false);
      })
      .catch(() => {
        setIsAuthChecking(false);
      });
  }, []);

  /**
   * Step 1: Validate password and dispatch Telegram 6-digit OTP
   */
  const handleAdminAuth = async (password) => {
    if (!password || password.length < 4) {
      return { ok: false, message: "Password must be at least 4 characters." };
    }

    const verify = await verifyOrSetupPassword(password);
    if (!verify.ok) {
      return { ok: false, message: verify.message || "Wrong admin password." };
    }

    return {
      ok: true,
      requires2FA: true,
      token: verify.token,
      expiresAt: verify.expiresAt,
      message: verify.message,
    };
  };

  /**
   * Step 2: Verify 6-digit Telegram OTP and unlock admin workspace
   */
  const handleVerifyOtp = async (otp, token) => {
    if (!otp || String(otp).trim().length !== 6) {
      return { ok: false, message: "Please enter the complete 6-digit PIN." };
    }

    const res = await verifyTelegramOtp(otp, token);
    if (!res.ok) {
      return { ok: false, message: res.message || "Invalid or expired OTP code." };
    }

    set2FAVerified(true);
    setIsAdminUnlocked(true);
    return { ok: true };
  };

  /**
   * Resend a fresh 6-digit OTP to Telegram
   */
  const handleResendOtp = async () => {
    const otpRes = await requestTelegramOtp();
    return otpRes;
  };

  /**
   * Sign out and clear 2FA credentials
   */
  const handleLogout = async () => {
    await logoutAdmin();
    clear2FAVerified();
    setIsAdminUnlocked(false);
  };

  return {
    isAdminUnlocked,
    setIsAdminUnlocked,
    isAuthChecking,
    handleAdminAuth,
    handleVerifyOtp,
    handleResendOtp,
    handleLogout,
  };
}
