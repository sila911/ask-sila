const sendStore = globalThis.__telegramSendStore || new Map();
globalThis.__telegramSendStore = sendStore;

if (sendStore.size > 2000) {
  sendStore.clear();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Rate limit: max 5 notifications per 10 minutes per IP
  const clientIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'client').split(',')[0].trim();
  const now = Date.now();
  const ipKey = `send:${clientIp}`;
  const timestamps = (sendStore.get(ipKey) || []).filter(ts => now - ts < 10 * 60 * 1000);

  if (timestamps.length >= 5) {
    return res.status(429).json({ message: 'Too many question notifications sent recently. Please try again later.' });
  }
  timestamps.push(now);
  sendStore.set(ipKey, timestamps);

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { question, questionId, notifyHandle } = body || {};

  const cleanQuestion = typeof question === 'string' ? question.trim() : '';
  if (!cleanQuestion || cleanQuestion.length < 4 || cleanQuestion.length > 500) {
    return res.status(400).json({ message: 'Valid question text between 4 and 500 characters is required' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Telegram credentials missing in environment variables');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const safeQuestion = escapeHtml(cleanQuestion);
  const cleanId = questionId && /^[a-zA-Z0-9_-]{1,64}$/.test(String(questionId).trim())
    ? escapeHtml(String(questionId).trim())
    : null;

  const rawHandle = notifyHandle ? String(notifyHandle).trim().replace(/^@+/, '').slice(0, 50) : null;
  const cleanHandle = rawHandle && /^[a-zA-Z0-9_]+$/.test(rawHandle)
    ? `@${escapeHtml(rawHandle)}`
    : null;

  let text = `🌟 <b>New Question on Ask Sila</b>:\n\n"${safeQuestion}"`;

  if (cleanHandle) {
    text += `\n\n🔔 <b>Notify</b>: ${cleanHandle}`;
  }

  if (cleanId) {
    text += `\n🆔 <b>Code</b>: <code>${cleanId}</code>`;
    text += `\n\n💬 <b>Reply instantly:</b>\n<i>Reply to this message OR tap command below:</i>\n<code>/reply ${cleanId} </code>`;
  } else {
    text += `\n\n💬 <i>Reply directly to this message to publish your answer!</i>`;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Telegram API error:', data);
      throw new Error(`Telegram API responded with ${response.status}: ${data.description || ''}`);
    }

    return res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return res.status(500).json({ message: 'Failed to send message' });
  }
}
