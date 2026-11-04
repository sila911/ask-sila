import { db } from "../db/index.js";
import { adminUsers } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateOtpCode,
  createOtpChallenge,
  verifyOtpChallenge,
} from "../utils/security.js";
import { sendTelegramMessage } from "../utils/telegram.js";
import dotenv from "dotenv";

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "semsila.dev@gmail.com";

export async function login(req, res) {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ ok: false, message: "Password is required." });
    }

    // 1. Check if admin exists in database
    let admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, ADMIN_EMAIL))
      .then((rows) => rows[0]);

    // If admin not seeded yet, create initial admin record with current password
    if (!admin) {
      const hashed = await hashPassword(password);
      const inserted = await db
        .insert(adminUsers)
        .values({
          email: ADMIN_EMAIL,
          passwordHash: hashed,
        })
        .returning();
      admin = inserted[0];
    } else {
      const isValid = await comparePassword(password, admin.passwordHash);
      if (!isValid) {
        return res.status(401).json({ ok: false, message: "Incorrect password." });
      }
    }

    // 2. Generate 6-digit OTP code & challenge token
    const otp = generateOtpCode();
    const { challengeToken, expiresAt } = createOtpChallenge(otp, ADMIN_EMAIL);

    // 3. Send OTP to Sila's Telegram
    const sent = await sendTelegramMessage(
      `🔐 <b>Ask Sila Admin 2FA Code</b>\n\nYour login verification code is:\n\n<code>${otp}</code>\n\n<i>This code expires in 5 minutes.</i>`
    );

    if (!sent) {
      console.warn("Could not dispatch Telegram OTP message.");
    }

    return res.json({
      ok: true,
      requires2fa: true,
      token: challengeToken,
      expiresAt,
      message: "Verification code sent to your Telegram.",
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ ok: false, message: "Authentication server error." });
  }
}

export async function verify2fa(req, res) {
  try {
    const { otp, token } = req.body;
    if (!otp || !token) {
      return res.status(400).json({ ok: false, message: "OTP code and challenge token are required." });
    }

    const verification = verifyOtpChallenge(String(otp).trim(), token);
    if (!verification.valid) {
      return res.status(400).json({ ok: false, message: verification.message });
    }

    // Generate JWT Session Token
    const jwtToken = generateToken({ email: verification.email, role: "admin" });

    // Set HttpOnly Cookie
    res.cookie("token", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      ok: true,
      token: jwtToken,
      admin: { email: verification.email },
      message: "2FA verified successfully.",
    });
  } catch (error) {
    console.error("2FA error:", error);
    return res.status(500).json({ ok: false, message: "Verification failed." });
  }
}

export async function requestOtp(req, res) {
  try {
    const otp = generateOtpCode();
    const { challengeToken, expiresAt } = createOtpChallenge(otp, ADMIN_EMAIL);

    await sendTelegramMessage(
      `🔐 <b>Ask Sila Admin Code</b>\n\nYour code is:\n\n<code>${otp}</code>\n\n<i>Expires in 5 minutes.</i>`
    );

    return res.json({
      ok: true,
      token: challengeToken,
      expiresAt,
      message: "Verification code sent to Telegram.",
    });
  } catch (error) {
    console.error("Request OTP error:", error);
    return res.status(500).json({ ok: false, message: "Failed to send code." });
  }
}

export async function getMe(req, res) {
  return res.json({
    ok: true,
    authenticated: true,
    admin: req.admin,
  });
}

export async function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.json({ ok: true, message: "Logged out successfully." });
}

export async function resetPassword(req, res) {
  try {
    const { code, token, newPassword } = req.body;
    if (!code || !token || !newPassword) {
      return res.status(400).json({ ok: false, message: "All fields are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, message: "Password must be at least 6 characters." });
    }

    const verification = verifyOtpChallenge(String(code).trim(), token);
    if (!verification.valid) {
      return res.status(400).json({ ok: false, message: verification.message });
    }

    const hashed = await hashPassword(newPassword);

    await db
      .update(adminUsers)
      .set({ passwordHash: hashed, updatedAt: new Date() })
      .where(eq(adminUsers.email, ADMIN_EMAIL));

    return res.json({ ok: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ ok: false, message: "Failed to reset password." });
  }
}
