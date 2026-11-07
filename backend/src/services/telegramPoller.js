import { processTelegramMessage } from "../controllers/telegram.controller.js";
import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let isPolling = false;
let shouldStop = false;
let lastUpdateId = 0;

export async function startTelegramPolling() {
  if (!BOT_TOKEN) {
    console.log("ℹ️ Telegram poller skipped: TELEGRAM_BOT_TOKEN is missing.");
    return;
  }

  if (isPolling) return;
  isPolling = true;
  shouldStop = false;

  console.log("🤖 Telegram Realtime Bot Poller started (Listening for swipe replies & /reply commands)...");

  while (!shouldStop) {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          const message = update.message || update.edited_message || update.channel_post;
          if (message) {
            await processTelegramMessage(message);
          }
        }
      } else if (data.error_code === 409) {
        // Webhook is active in production
        console.log("ℹ️ Telegram webhook is active in production; long-polling is standby.");
        await new Promise((r) => setTimeout(r, 60000));
      } else if (!data.ok) {
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (err) {
      // Catch network timeouts or temporary disconnects and retry gracefully
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  isPolling = false;
}

export function stopTelegramPolling() {
  shouldStop = true;
}
