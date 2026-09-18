import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // 1. Verify Telegram Webhook Secret Token if configured
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (incomingSecret !== webhookSecret) {
      console.warn('Webhook rejected: Invalid or missing X-Telegram-Bot-Api-Secret-Token');
      return res.status(403).json({ message: 'Forbidden: Invalid secret token' });
    }
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const message = body?.message || body?.edited_message || body?.channel_post;

    if (!message || (!message.text && !message.caption)) {
      return res.status(200).json({ message: 'Ignored: No text or caption in message' });
    }

    // 2. Verify Message Origin against TELEGRAM_CHAT_ID
    const allowedChatId = process.env.TELEGRAM_CHAT_ID;
    const messageChatId = String(message.chat?.id || '');
    const messageFromId = String(message.from?.id || '');

    if (allowedChatId && messageChatId !== String(allowedChatId) && messageFromId !== String(allowedChatId)) {
      console.warn(`Webhook rejected: Unauthorized chat ID ${messageChatId} (expected ${allowedChatId})`);
      return res.status(403).json({ message: 'Forbidden: Unauthorized Telegram chat origin' });
    }

    const text = (message.text || message.caption || '').trim();
    let questionId = null;
    let answerText = null;

    // Mode A: Direct swipe reply to a question notification
    if (message.reply_to_message) {
      const replyToText = message.reply_to_message.text || message.reply_to_message.caption || '';
      const match =
        replyToText.match(/Code:\s*([a-zA-Z0-9-]+)/i) ||
        replyToText.match(/<code>([a-zA-Z0-9-]+)<\/code>/i) ||
        replyToText.match(/\/reply\s+([a-zA-Z0-9-]+)/i) ||
        replyToText.match(/#id_([a-zA-Z0-9-]+)/i) ||
        replyToText.match(/id_([a-zA-Z0-9-]+)/i);
      
      if (match) {
        questionId = match[1].trim();
        if (text.startsWith('/reply') || text.startsWith('/answer')) {
          const rest = text.replace(/^\/(reply|answer)\s*/i, '').trim();
          const firstWord = rest.split(/\s+/)[0];
          if (firstWord === questionId || firstWord === `#id_${questionId}` || firstWord === `id_${questionId}`) {
            answerText = rest.slice(firstWord.length).trim();
          } else {
            answerText = rest;
          }
        } else {
          answerText = text;
        }
      }
    }

    // Mode B: Slash command format: /reply <id> <answer> or /answer <id> <answer>
    if (!questionId && (text.startsWith('/reply') || text.startsWith('/answer'))) {
      const rest = text.replace(/^\/(reply|answer)\s*/i, '').trim();
      const parts = rest.split(/\s+/);
      if (parts.length >= 2) {
        questionId = parts[0].replace(/^(#?id_)/, '').trim();
        answerText = parts.slice(1).join(' ');
      }
    }

    if (!questionId || !answerText) {
      return res.status(200).json({ message: 'Ignored: Not a recognized reply or command' });
    }

    // Initialize Supabase (support SERVICE_ROLE_KEY if available for full permissions)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ message: 'Server configuration error: missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Question
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (fetchError || !question) {
      console.error('Question not found:', fetchError);
      return res.status(200).json({ message: 'Question not found' });
    }

    const now = new Date().toISOString();

    // 2. Update Question Status
    const { error: updateError } = await supabase
      .from('questions')
      .update({
        status: 'answered',
        answeredAt: now,
      })
      .eq('id', questionId);

    if (updateError) {
      console.error('Failed to update question:', updateError);
      return res.status(500).json({ message: 'Failed to update question: ' + updateError.message });
    }

    // 3. Create or Update Design Entry
    const designId = typeof randomUUID === 'function' ? randomUUID() : `design-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const designData = {
      id: designId,
      questionId: question.id,
      questionText: question.question,
      answerText: answerText,
      text: `Q: ${question.question}\nA: ${answerText}`,
      style: defaultStyle,
      imageDataUrl: "",
      createdAt: now,
      updatedAt: now,
      stats: { copies: 0, downloads: 0, shares: 0 },
    };

    const { error: designError } = await supabase
      .from('designs')
      .insert([designData]);

    if (designError) {
      console.error('Failed to save design:', designError);
      // If RLS blocks design insert, log it clearly
      return res.status(500).json({ message: 'Failed to save design: ' + designError.message });
    }

    // 4. Send Confirmation back to Telegram with Notify Handle reminder
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = message.chat.id;

    if (botToken && chatId) {
      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      let confirmText = `✅ <b>Answer published to Ask Sila!</b> 🚀\n\n<b>Q:</b> "${escapeHtml(question.question)}"\n<b>A:</b> "${escapeHtml(answerText)}"`;
      
      if (question.notify_handle) {
        const cleanH = `@${String(question.notify_handle).trim().replace(/^@+/, '')}`;
        confirmText += `\n\n🔔 <b>User to notify:</b> <a href="https://t.me/${cleanH.slice(1)}">${cleanH}</a>`;
      }

      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: confirmText,
          parse_mode: 'HTML',
          reply_to_message_id: message.message_id,
        }),
      }).catch(err => console.error('Telegram reply error:', err));
    }

    return res.status(200).json({ message: 'Answer processed successfully' });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ message: 'Internal server error: ' + (error?.message || error) });
  }
}
