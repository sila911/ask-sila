// In-memory attempt & cooldown store across requests within container lifecycle
const attemptStore = globalThis.__otpAttemptStore || new Map();
globalThis.__otpAttemptStore = attemptStore;

// Clean up stale memory entries periodically
if (attemptStore.size > 2000) {
  attemptStore.clear();
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const { action, otp, token } = body || {};
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.TELEGRAM_BOT_TOKEN;

    if (!secret) {
      console.error("Server security configuration error: Neither SUPABASE_SERVICE_ROLE_KEY nor TELEGRAM_BOT_TOKEN is set.");
      return res.status(500).json({
        ok: false,
        message: "Server security configuration error.",
      });
    }

    const clientIp = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "client").split(",")[0].trim();
    const now = Date.now();

    // ─────────────────────────────────────────────────────────────
    // Action 1: Send OTP to Telegram
    // ─────────────────────────────────────────────────────────────
    if (action === "send") {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!botToken || !chatId) {
        console.error("Telegram credentials missing for 2FA OTP");
        return res.status(500).json({
          ok: false,
          message: "Telegram configuration error on server",
        });
      }

      // Rate limit send requests (25 second cooldown per client IP)
      const lastSent = attemptStore.get(`send:${clientIp}`) || 0;
      if (now - lastSent < 25000) {
        const waitSec = Math.ceil((25000 - (now - lastSent)) / 1000);
        return res.status(429).json({
          ok: false,
          message: `Please wait ${waitSec}s before requesting a new code.`,
        });
      }
      attemptStore.set(`send:${clientIp}`, now);

      // Generate 6-digit numeric PIN
      const generatedOtp = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = now + 59 * 1000; // 60 seconds validity

      // Sign with HMAC
      const hmac = crypto
        .createHmac("sha256", secret)
        .update(`${generatedOtp}:${expiresAt}`)
        .digest("hex");
      const verificationToken = `${expiresAt}:${hmac}`;

      const messageText = `🔐 <b>Ask Sila — 2FA Verification </b>\n\n<code>${generatedOtp}</code>\n\n⏱️ Valid for <b>60s</b> only.`;

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const tgResponse = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: "HTML",
        }),
      });

      const tgData = await tgResponse.json();

      if (!tgResponse.ok || !tgData.ok) {
        console.error("Failed to send OTP to Telegram:", tgData);
        return res.status(500).json({
          ok: false,
          message:
            "Failed to deliver OTP to Telegram. Please check Telegram bot configuration.",
        });
      }

      return res.status(200).json({
        ok: true,
        token: verificationToken,
        expiresAt,
        message:
          "A 6-digit verification code has been sent to your Telegram bot.",
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Action 2: Verify OTP
    // ─────────────────────────────────────────────────────────────
    if (action === "verify") {
      if (!otp || !token) {
        return res.status(400).json({
          ok: false,
          message: "OTP code and verification token are required",
        });
      }

      const cleanOtp = String(otp).trim();
      const [expiresAtStr, providedHmac] = String(token).split(":");

      if (!expiresAtStr || !providedHmac) {
        return res
          .status(400)
          .json({ ok: false, message: "Invalid verification token format" });
      }

      // Check max failed attempts (Max 5 attempts allowed per token)
      const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex").slice(0, 24);
      const attemptKey = `attempts:${tokenHash}`;
      const failedCount = attemptStore.get(attemptKey) || 0;

      if (failedCount >= 5) {
        return res.status(429).json({
          ok: false,
          message: "Too many incorrect attempts. This code is invalidated. Please request a new code.",
        });
      }

      const expiresAt = Number(expiresAtStr);
      if (now > expiresAt) {
        return res.status(400).json({
          ok: false,
          message: "Verification code has expired. Please request a new code.",
        });
      }

      const expectedHmac = crypto
        .createHmac("sha256", secret)
        .update(`${cleanOtp}:${expiresAtStr}`)
        .digest("hex");

      // Constant-time comparison
      const providedBuffer = Buffer.from(providedHmac, "hex");
      const expectedBuffer = Buffer.from(expectedHmac, "hex");

      if (
        providedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
      ) {
        attemptStore.set(attemptKey, failedCount + 1);
        const remaining = 5 - (failedCount + 1);
        return res.status(400).json({
          ok: false,
          message: remaining > 0
            ? `Incorrect 6-digit code. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`
            : "Too many incorrect attempts. Please request a new code.",
        });
      }

      // Success: clean up attempt counter
      attemptStore.delete(attemptKey);

      return res.status(200).json({
        ok: true,
        verified: true,
        message: "2FA verification successful.",
      });
    }

    return res
      .status(400)
      .json({ ok: false, message: "Unknown action specified" });
  } catch (error) {
    console.error("Error in telegram-otp API handler:", error);
    return res.status(500).json({
      ok: false,
      message: "Internal server error: " + (error?.message || error),
    });
  }
}
