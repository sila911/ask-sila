import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_dev_only";

export async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

export async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

export function generateToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate signed challenge token for OTP verification
export function createOtpChallenge(code, email, expiresInMs = 5 * 60 * 1000) {
  const expiresAt = Date.now() + expiresInMs;
  const data = `${email}:${code}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", JWT_SECRET).update(data).digest("hex");
  const challengeToken = Buffer.from(JSON.stringify({ email, expiresAt, hmac })).toString("base64");
  return { challengeToken, expiresAt };
}

// Verify OTP against the challenge token
export function verifyOtpChallenge(code, challengeToken) {
  try {
    const raw = Buffer.from(challengeToken, "base64").toString("utf-8");
    const { email, expiresAt, hmac } = JSON.parse(raw);

    if (Date.now() > expiresAt) {
      return { valid: false, message: "Verification code has expired." };
    }

    const expectedData = `${email}:${code}:${expiresAt}`;
    const expectedHmac = crypto.createHmac("sha256", JWT_SECRET).update(expectedData).digest("hex");

    if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return { valid: true, email };
    }
    return { valid: false, message: "Invalid verification code." };
  } catch (err) {
    return { valid: false, message: "Malformed challenge token." };
  }
}
