import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  verifyOrSetupPassword,
  requestTelegramOtp,
  verifyTelegramOtp,
  logoutAdmin,
  is2FAVerified,
  set2FAVerified,
  clear2FAVerified,
} from "../lib/adminAccess";

/**
 * Manages admin authentication state, 2FA verification, and Supabase auth listeners.
 */
export function useAdminAuth() {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    // Check existing session and 2FA verification on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && is2FAVerified()) {
        setIsAdminUnlocked(true);
      } else {
        setIsAdminUnlocked(false);
      }
      setIsAuthChecking(false);
    }).catch(() => {
      setIsAuthChecking(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        if (is2FAVerified()) {
          setIsAdminUnlocked(true);
        }
      } else if (event === "SIGNED_OUT") {
        clear2FAVerified();
        setIsAdminUnlocked(false);
      }
      setIsAuthChecking(false);
    });

    return () => {
      subscription.unsubscribe();
    };
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

    // Password verified! Now dispatch Telegram 2FA OTP
    const otpRes = await requestTelegramOtp();
    if (!otpRes.ok) {
      return {
        ok: false,
        message: otpRes.message || "Authentication service unavailable. Please try again.",
      };
    }

    return {
      ok: true,
      requires2FA: true,
      token: otpRes.token,
      expiresAt: otpRes.expiresAt,
      message: otpRes.message,
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
