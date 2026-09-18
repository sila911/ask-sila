import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Custom Vite plugin to handle /api endpoints & live Telegram polling during local development
function apiDevPlugin() {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      Object.assign(process.env, env);

      // 1. Live Background Telegram Poller during local dev
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        let lastUpdateId = 0;
        let isPolling = true;

        server.httpServer?.on('close', () => {
          isPolling = false;
        });

        const pollTelegram = async () => {
          if (!isPolling) return;
          try {
            const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=10`);
            const data = await res.json();

            if (data.ok && Array.isArray(data.result)) {
              for (const update of data.result) {
                lastUpdateId = update.update_id;

                if (update.message && update.message.text) {
                  const chatId = String(update.message.chat?.id || '');
                  const fromId = String(update.message.from?.id || '');
                  const expectedChatId = String(process.env.TELEGRAM_CHAT_ID || '');

                  if (expectedChatId && chatId !== expectedChatId && fromId !== expectedChatId) {
                    continue;
                  }

                  const sender = update.message.from?.username ? `@${update.message.from.username}` : (update.message.from?.first_name || 'User');
                  console.log(`\n🤖 [Telegram Bot] Received: "${update.message.text}" from ${sender}`);

                  try {
                    const { default: webhookHandler } = await import('./api/telegram-webhook.js');
                    const fakeReq = {
                      method: 'POST',
                      headers: process.env.TELEGRAM_WEBHOOK_SECRET
                        ? { 'x-telegram-bot-api-secret-token': process.env.TELEGRAM_WEBHOOK_SECRET }
                        : {},
                      body: { message: update.message },
                    };
                    const fakeRes = {
                      status: () => fakeRes,
                      json: (resData) => console.log('⚡ [Telegram Bot] Result:', resData),
                    };

                    await webhookHandler(fakeReq, fakeRes);
                  } catch (handlerErr) {
                    console.error('Webhook execution error:', handlerErr);
                  }
                }
              }
            }
          } catch (err) {
            // Ignore transient network errors
          }

          if (isPolling) {
            setTimeout(pollTelegram, 1000);
          }
        };

        setTimeout(pollTelegram, 1200);
      }

      // 2. Local Middleware for /api routes
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';

        if (url === '/api/telegram-send') {
          try {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                req.body = body ? JSON.parse(body) : {};
              } catch (e) {
                req.body = {};
              }

              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };

              const { default: handler } = await import('./api/telegram-send.js');
              await handler(req, res);
            });
            return;
          } catch (err) {
            console.error('API Dev Server error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        if (url === '/api/telegram-otp') {
          try {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                req.body = body ? JSON.parse(body) : {};
              } catch (e) {
                req.body = {};
              }

              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };

              const { default: handler } = await import('./api/telegram-otp.js');
              await handler(req, res);
            });
            return;
          } catch (err) {
            console.error('API Telegram OTP Dev Server error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        if (url === '/api/telegram-webhook') {
          try {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                req.body = body ? JSON.parse(body) : {};
              } catch (e) {
                req.body = {};
              }

              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };

              const { default: handler } = await import('./api/telegram-webhook.js');
              await handler(req, res);
            });
            return;
          } catch (err) {
            console.error('API Webhook Dev Server error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
})