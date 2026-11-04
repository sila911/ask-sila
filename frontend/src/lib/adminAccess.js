import { apiRequest } from "./apiClient";

const ADMIN_EMAIL = "semsila.dev@gmail.com";
const TWO_FACTOR_KEY = "sila_admin_2fa_verified";
const ADMIN_TOKEN_KEY = "sila_admin_token";

export function is2FAVerified() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(TWO_FACTOR_KEY) === "true";
}

export function set2FAVerified(verified = true) {
  if (typeof window === "undefined") return;
  if (verified) {
    sessionStorage.setItem(TWO_FACTOR_KEY, "true");
  } else {
    sessionStorage.removeItem(TWO_FACTOR_KEY);
  }
}

export function clear2FAVerified() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TWO_FACTOR_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function hasAdminPassword() {
  try {
    const res = await apiRequest("/auth/me");
    return res.authenticated === true;
  } catch (error) {
    return false;
  }
}

export async function verifyOrSetupPassword(password) {
  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { password },
    });

    return {
      ok: true,
      requires2FA: data.requires2fa,
      token: data.token,
      expiresAt: data.expiresAt,
      message: data.message,
    };
  } catch (error) {
    return { ok: false, message: error.message || "Login failed." };
  }
}

export async function requestTelegramOtp() {
  try {
    const data = await apiRequest("/auth/request-otp", {
      method: "POST",
    });

    return {
      ok: true,
      token: data.token,
      expiresAt: data.expiresAt,
      message: data.message || "Verification code sent to Telegram.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message || "Network error sending OTP. Please try again.",
    };
  }
}

export async function verifyTelegramOtp(otp, token) {
  try {
    const data = await apiRequest("/auth/verify-2fa", {
      method: "POST",
      body: {
        otp: String(otp).trim(),
        token: token,
      },
    });

    if (data.token && typeof window !== "undefined") {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    }

    set2FAVerified(true);
    return { ok: true, message: data.message || "2FA verified successfully." };
  } catch (error) {
    return {
      ok: false,
      message: error.message || "Invalid or expired OTP code.",
    };
  }
}

export async function requestPasswordReset(inputEmail) {
  const email = (inputEmail || "").trim().toLowerCase();
  if (email !== ADMIN_EMAIL.toLowerCase()) {
    throw new Error("Email doesn't match admin email.");
  }

  const res = await apiRequest("/auth/request-otp", { method: "POST" });
  return { message: "6-digit reset code sent to your Telegram!" };
}

export async function submitPasswordReset(code, newPassword, token) {
  const cleanCode = String(code).trim();
  if (!cleanCode || cleanCode.length < 6) {
    throw new Error("Please enter the full 6-digit verification code.");
  }
  if (!newPassword || newPassword.length < 4) {
    throw new Error("New password must be at least 4 characters.");
  }

  const res = await apiRequest("/auth/reset-password", {
    method: "POST",
    body: {
      code: cleanCode,
      token,
      newPassword,
    },
  });

  return { message: res.message || "Password reset successful!" };
}

export async function logoutAdmin() {
  clear2FAVerified();
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch (err) {
    // Ignore network error on logout
  }
}

export async function createEncryptedAdminToken() {
  return "";
}

export async function validateEncryptedAdminToken() {
  return false;
}
