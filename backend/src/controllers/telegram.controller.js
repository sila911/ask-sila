import { db } from "../db/index.js";
import { questions, designs } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";
import { sendTelegramMessage } from "../utils/telegram.js";
import dotenv from "dotenv";

dotenv.config();

const defaultStyle = {
  bgColor: "#102a43",
  accentColor: "#2cb1bc",
  panelColor: "rgba(255,255,255,0.13)",
  textColor: "#f0f4f8",
  frameColor: "#ffffff",
  frameWidth: 16,
  frameRadius: 48,
  questionFontSize: 42,
  answerFontSize: 62,
  fontFamily: "Mali",
  align: "center",
  aspectRatio: "9:16",
  showQRCode: true,
};

export async function processTelegramMessage(message) {
  try {
    if (!message || (!message.text && !message.caption)) {
      return { ok: false, reason: "No text or caption" };
    }

    const allowedChatId = process.env.TELEGRAM_CHAT_ID;
    const messageChatId = String(message.chat?.id || "");
    const messageFromId = String(message.from?.id || "");

    if (allowedChatId && messageChatId !== String(allowedChatId) && messageFromId !== String(allowedChatId)) {
      console.warn(`[Telegram Bot] Ignored message from unauthorized chat: ${messageChatId} / ${messageFromId}`);
      return { ok: false, reason: "Unauthorized chat ID" };
    }

    const text = (message.text || message.caption || "").trim();

    // ─── Command: /status ────────────────────────────────────────────────────
    if (text.startsWith("/status")) {
      const allQ = await db.select().from(questions).where(eq(questions.isDeleted, false));
      const pendingCount = allQ.filter((q) => q.status !== "answered").length;
      const answeredCount = allQ.filter((q) => q.status === "answered").length;

      await sendTelegramMessage(
        `📊 <b>Ask Sila Dashboard Status</b>\n\n` +
        `⏳ <b>Pending Questions:</b> ${pendingCount}\n` +
        `✅ <b>Answered Questions:</b> ${answeredCount}\n` +
        `📝 <b>Total Questions:</b> ${allQ.length}\n\n` +
        `<i>Type <code>/pending</code> to view unanswered questions!</i>`
      );
      return { ok: true, command: "status" };
    }

    // ─── Command: /pending or /questions ─────────────────────────────────────
    if (text.startsWith("/pending") || text.startsWith("/questions")) {
      const allQ = await db
        .select()
        .from(questions)
        .where(eq(questions.isDeleted, false))
        .orderBy(desc(questions.createdAt));

      const pendingQ = allQ.filter((q) => q.status !== "answered").slice(0, 5);

      if (pendingQ.length === 0) {
        await sendTelegramMessage("🎉 <b>All caught up!</b> There are no pending questions right now.");
        return { ok: true, command: "pending" };
      }

      let response = `⏳ <b>Pending Questions (${pendingQ.length}):</b>\n\n`;
      pendingQ.forEach((q, idx) => {
        response += `<b>${idx + 1}.</b> <code>#${q.id}</code>: "${q.question}"\n`;
        if (q.notifyHandle) response += `   <i>👤 @${q.notifyHandle}</i>\n`;
      });
      response += `\n<i>💡 To answer, swipe reply or type:</i>\n<code>/reply &lt;ID&gt; &lt;your answer&gt;</code>`;

      await sendTelegramMessage(response);
      return { ok: true, command: "pending" };
    }

    // ─── Command: /help ──────────────────────────────────────────────────────
    if (text.startsWith("/help") || text.startsWith("/start")) {
      await sendTelegramMessage(
        `🤖 <b>Ask Sila Telegram Assistant</b>\n\n` +
        `<b>Answering Questions:</b>\n` +
        `• <b>Swipe Reply:</b> Swipe on any new question alert and type your answer!\n` +
        `• <b>Slash Command:</b> Type <code>/reply &lt;ID&gt; &lt;your answer&gt;</code>\n\n` +
        `<b>Helpful Commands:</b>\n` +
        `• <code>/pending</code> — Show pending questions\n` +
        `• <code>/status</code> — Show stats & counts\n` +
        `• <code>/help</code> — Show this guide`
      );
      return { ok: true, command: "help" };
    }

    let questionId = null;
    let answerText = null;

    // ─── Method A: Direct Swipe Reply ─────────────────────────────────────────
    if (message.reply_to_message) {
      const replyToText = message.reply_to_message.text || message.reply_to_message.caption || "";
      const match =
        replyToText.match(/ID:\s*#?([a-zA-Z0-9-]+)/i) ||
        replyToText.match(/Code:\s*#?([a-zA-Z0-9-]+)/i) ||
        replyToText.match(/<code>#?([a-zA-Z0-9-]+)<\/code>/i) ||
        replyToText.match(/\/reply\s+#?([a-zA-Z0-9-]+)/i) ||
        replyToText.match(/#id_([a-zA-Z0-9-]+)/i) ||
        replyToText.match(/#([0-9]{5,})/i);

      if (match) {
        questionId = match[1].replace(/^#/, "").trim();
        if (text.startsWith("/reply") || text.startsWith("/answer")) {
          const rest = text.replace(/^\/(reply|answer)\s*/i, "").trim();
          const firstWord = rest.split(/\s+/)[0];
          if (firstWord.replace(/^#/, "") === questionId || firstWord === `#id_${questionId}`) {
            answerText = rest.slice(firstWord.length).trim();
          } else {
            answerText = rest;
          }
        } else {
          answerText = text;
        }
      }
    }

    // ─── Method B: Slash command format: /reply <id> <answer> ────────────────
    if (!questionId && (text.startsWith("/reply") || text.startsWith("/answer"))) {
      const rest = text.replace(/^\/(reply|answer)\s*/i, "").trim();
      const parts = rest.split(/\s+/);
      if (parts.length >= 2) {
        questionId = parts[0].replace(/^(#?id_|#)/, "").trim();
        answerText = parts.slice(1).join(" ");
      }
    }

    if (!questionId || !answerText) {
      return { ok: false, reason: "Not a question answer." };
    }

    // Find question
    const [q] = await db.select().from(questions).where(eq(questions.id, questionId));
    if (!q) {
      await sendTelegramMessage(`⚠️ <b>Question #${questionId} not found.</b> Please check the ID.`);
      return { ok: false, reason: "Question not found" };
    }

    const now = new Date();

    // 1. Update question status to answered
    await db
      .update(questions)
      .set({
        status: "answered",
        answeredAt: now,
      })
      .where(eq(questions.id, questionId));

    // 2. Check if design card already exists, update or insert
    const [existingDesign] = await db
      .select()
      .from(designs)
      .where(eq(designs.questionId, q.id));

    if (existingDesign) {
      await db
        .update(designs)
        .set({
          answerText: answerText,
          text: `Q: ${q.question}\nA: ${answerText}`,
          updatedAt: now,
        })
        .where(eq(designs.id, existingDesign.id));
    } else {
      const designId = crypto.randomUUID();
      await db.insert(designs).values({
        id: designId,
        questionId: q.id,
        questionText: q.question,
        answerText: answerText,
        text: `Q: ${q.question}\nA: ${answerText}`,
        style: defaultStyle,
        imageDataUrl: "",
        createdAt: now,
        updatedAt: now,
        stats: { copies: 0, downloads: 0, shares: 0 },
      });
    }

    // 3. Send celebratory confirmation back to Sila in Telegram
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    let confirmMsg =
      `🎉 <b>Answer Published Live to Ask Sila! 🚀</b>\n\n` +
      `<b>Question:</b> "${q.question}"\n` +
      `<b>Your Answer:</b> "${answerText}"\n`;

    if (q.notifyHandle) {
      confirmMsg += `<b>👤 Asked by:</b> @${q.notifyHandle}\n`;
    }

    confirmMsg += `\n🔗 <a href="${clientUrl}">View on Live Feed</a>`;

    await sendTelegramMessage(confirmMsg);

    return { ok: true, questionId, answerText };
  } catch (error) {
    console.error("Telegram message processing error:", error);
    return { ok: false, error: error.message };
  }
}

export async function handleWebhook(req, res) {
  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret = req.headers["x-telegram-bot-api-secret-token"];
      if (incomingSecret !== webhookSecret) {
        return res.status(403).json({ message: "Forbidden: Invalid secret token" });
      }
    }

    const message = req.body?.message || req.body?.edited_message || req.body?.channel_post;
    const result = await processTelegramMessage(message);
    return res.json(result);
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ ok: false, message: "Error processing webhook." });
  }
}
