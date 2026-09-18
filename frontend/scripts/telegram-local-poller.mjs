import fs from 'fs';
import path from 'path';

// Parse .env manually without external dependencies
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let value = (match[2] || '').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[match[1]] = value;
      }
    }
  }
} catch (e) {
  console.error('Could not load .env file:', e);
}

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN is missing in frontend/.env');
  process.exit(1);
}

console.log('🤖 Telegram Local Dev Poller started!');
console.log('📡 Listening for replies and /reply commands in Telegram...\n');

let lastUpdateId = 0;

async function poll() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`);
    const data = await res.json();

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        lastUpdateId = update.update_id;

        if (update.message && update.message.text) {
          const chatId = String(update.message.chat?.id || '');
          const fromId = String(update.message.from?.id || '');
          const expectedChatId = String(process.env.TELEGRAM_CHAT_ID || '');

          if (expectedChatId && chatId !== expectedChatId && fromId !== expectedChatId) {
            console.warn(`⚠️ [Ignored] Message from unauthorized chat/user: ${chatId} / ${fromId}`);
            continue;
          }

          const sender = update.message.from?.username ? `@${update.message.from.username}` : (update.message.from?.first_name || 'User');
          console.log(`📩 Received message from ${sender}: "${update.message.text}"`);

          const { default: webhookHandler } = await import('../api/telegram-webhook.js?t=' + Date.now());

          const req = {
            method: 'POST',
            headers: process.env.TELEGRAM_WEBHOOK_SECRET
              ? { 'x-telegram-bot-api-secret-token': process.env.TELEGRAM_WEBHOOK_SECRET }
              : {},
            body: { message: update.message },
          };

          const fakeRes = {
            statusCode: 200,
            status(code) {
              this.statusCode = code;
              return this;
            },
            json(result) {
              console.log(`⚡ Processed [${this.statusCode}]:`, result);
            },
          };

          await webhookHandler(req, fakeRes);
        }
      }
    }
  } catch (err) {
    if (!err.message?.includes('aborted') && !err.message?.includes('fetch failed')) {
      console.error('Polling error:', err.message);
    }
  }

  // Continue polling loop
  setTimeout(poll, 800);
}

poll();
