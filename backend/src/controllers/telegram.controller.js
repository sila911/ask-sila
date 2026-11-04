import { db } from "../db/index.js";
import { questions, designs } from "../db/schema.js";
import { eq } from "drizzle-orm";
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
    if (!message || (!message.text && !message.caption)) {
      return res.status(200).json({ message: "Ignored: No text or caption" });
    }

    const allowedChatId = process.env.TELEGRAM_CHAT_ID;
    const messageChatId = String(message.chat?.id || "");
    const messageFromId = String(message.from?.id || "");

    if (allowedChatId && messageChatId !== String(allowedChatId) && messageFromId !== String(allowedChatId)) {
      return res.status(403).json({ message: "Forbidden: Unauthorized chat ID" });
    }

    const text = (message.text || message.caption || "").trim();
    let questionId = null;
    let answerText = null;

    // Direct swipe reply
    if (message.reply_to_message) {
      const replyToText = message.reply_to_message.text || message.reply_to_message.caption || "";
      const match =
        replyToText.match(/Code:\s*([a-zA-Z0-9-]+)/i) ||
        replyToText.match(/<code>([a-zA-Z0-9-]+)<\/code>/i) ||
        replyToText.match(/\/reply\s+([a-zA-Z0-9-]+)/i) ||
        replyToText.match(/#id_([a-zA-Z0-9-]+)/i) ||
        replyToText.match(/id_([a-zA-Z0-9-]+)/i);

      if (match) {
        questionId = match[1].trim();
        if (text.startsWith("/reply") || text.startsWith("/answer")) {
          const rest = text.replace(/^\/(reply|answer)\s*/i, "").trim();
          const firstWord = rest.split(/\s+/)[0];
          if (firstWord === questionId || firstWord === `#id_${questionId}`) {
            answerText = rest.slice(firstWord.length).trim();
          } else {
            answerText = rest;
          }
        } else {
          answerText = text;
        }
      }
    }

    // Slash command format: /reply <id> <answer>
    if (!questionId && (text.startsWith("/reply") || text.startsWith("/answer"))) {
      const rest = text.replace(/^\/(reply|answer)\s*/i, "").trim();
      const parts = rest.split(/\s+/);
      if (parts.length >= 2) {
        questionId = parts[0].replace(/^(#?id_)/, "").trim();
        answerText = parts.slice(1).join(" ");
      }
    }

    if (!questionId || !answerText) {
      return res.status(200).json({ message: "Ignored: Not a question answer." });
    }

    // Find question
    const [q] = await db.select().from(questions).where(eq(questions.id, questionId));
    if (!q) {
      return res.status(200).json({ message: "Question not found" });
    }

    const now = new Date();

    // Update question status
    await db
      .update(questions)
      .set({
        status: "answered",
        answeredAt: now,
      })
      .where(eq(questions.id, questionId));

    // Save design
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

    // Notify confirmation in Telegram
    await sendTelegramMessage(
      `✅ <b>Answer published for Question #${questionId}!</b>\n\n<b>Answer:</b> <i>"${answerText}"</i>`
    );

    return res.json({ ok: true, message: "Answer published successfully." });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ ok: false, message: "Error processing webhook." });
  }
}
