# Strict Security Rule: Zero Hardcoding of Sensitive Values & Environment Variables

## 1. Absolute Rule
**NEVER hardcode sensitive values, production URLs, personal emails, secrets, API keys, bot tokens, or environment-specific configurations anywhere in the codebase.**

Any environment-specific or sensitive parameter MUST be provided exclusively through environment variables (`.env`, `process.env.*`, `import.meta.env.*`) and never tracked in Git.

---

## 2. Forbidden Invariants
- **NEVER hardcode production service or deployment URLs**:
  - Do NOT hardcode Render URLs (e.g. `https://*.onrender.com`), Vercel URLs (e.g. `https://*.vercel.app`), or Supabase / Neon connection strings into frontend or backend code files, configuration files (`vercel.json`, `render.yaml`), scripts, or headers.
  - Production base API URLs must be injected dynamically via `VITE_API_URL` or `CLIENT_URL` / `DATABASE_URL`.
- **NEVER hardcode personal emails or identities**:
  - Do NOT hardcode personal email addresses (e.g., `developer@example.com` or `admin@example.com`) as default parameters, fallback strings (`|| "..."`), in UI placeholders, in SQL migration files, or in test scripts.
  - Use generic placeholders (e.g. `admin@example.com` or `"Enter registered admin email..."`) in example files or UI.
- **NEVER hardcode credentials or secrets**:
  - Passwords, JWT secrets, Telegram bot tokens, chat IDs, webhook secrets must NEVER have default fallbacks in code like `process.env.JWT_SECRET || "fallback"`. If an environment variable is required, throw an explicit configuration error at server startup.

---

## 3. Allowed Patterns

### Backend
```javascript
// Correct: Validate and read strictly from environment
const CLIENT_URL = process.env.CLIENT_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!ADMIN_EMAIL) {
  throw new Error("ADMIN_EMAIL environment variable is missing.");
}
```

### Frontend
```javascript
// Correct: Injected via Vite environment variable
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, "")}/api`
  : "/api";
```

### Infrastructure / Deployment Configs
- In `render.yaml`: Set `sync: false` for all secrets and variables instead of embedding values (`value: ...`).
- In `vercel.json`: Keep routing generic (SPA fallback `/(.*) -> /index.html`). Never embed target host URLs.
- In `.env.example`: Only use descriptive dummy placeholders like `<your-database-url>` and `admin@example.com`.
