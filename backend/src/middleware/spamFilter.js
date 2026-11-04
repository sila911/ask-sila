const BLOCKED_WORDS = [
  "nigger", "nigga", "faggot", "chink", "retard", "kike",
  "kys", "kill yourself", "die bitch", "bitch ass", "slut", "whore",
  "porn", "porno", "xxx", "viagra", "cialis", "casino", "betting", "free crypto",
  "telegram.me/", "t.me/", "bit.ly/", "tinyurl.com/", "whatsapp.com/",
  "hack", "ddos", "doxx", "dox"
];

export function validateQuestionMiddleware(req, res, next) {
  const text = (req.body?.question || "").trim();

  if (!text || text.length < 4) {
    return res.status(400).json({
      ok: false,
      message: "Question must be at least 4 characters.",
    });
  }

  if (text.length > 500) {
    return res.status(400).json({
      ok: false,
      message: "Question cannot exceed 500 characters.",
    });
  }

  // Check repetitive character spam (e.g. "aaaaaaa", "?????!!!!!")
  const repetitiveCharRegex = /(.)\1{6,}/i;
  if (repetitiveCharRegex.test(text)) {
    return res.status(400).json({
      ok: false,
      message: "Please avoid repeated character spam.",
    });
  }

  // Check keyboard smash / single repeated word spam
  const words = text.toLowerCase().split(/\s+/);
  if (words.length >= 4) {
    const firstWord = words[0];
    const allSame = words.every((w) => w === firstWord);
    if (allSame) {
      return res.status(400).json({
        ok: false,
        message: "Repetitive word spam detected.",
      });
    }
  }

  // Blocked offensive words check
  const lower = text.toLowerCase();
  for (const blocked of BLOCKED_WORDS) {
    if (lower.includes(blocked)) {
      return res.status(400).json({
        ok: false,
        message: "Your message contains prohibited or inappropriate content.",
      });
    }
  }

  next();
}

export function validateCommentMiddleware(req, res, next) {
  const text = (req.body?.text || "").trim();

  if (!text || text.length < 1) {
    return res.status(400).json({
      ok: false,
      message: "Comment cannot be empty.",
    });
  }

  if (text.length > 500) {
    return res.status(400).json({
      ok: false,
      message: "Comment cannot exceed 500 characters.",
    });
  }

  const lower = text.toLowerCase();
  for (const blocked of BLOCKED_WORDS) {
    if (lower.includes(blocked)) {
      return res.status(400).json({
        ok: false,
        message: "Your comment contains prohibited content.",
      });
    }
  }

  next();
}
