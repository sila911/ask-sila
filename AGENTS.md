# Ask Sila Anything — Project Architecture & UI Design System

This file provides the single source of truth for the codebase, UI design system, state patterns, and coding conventions for the **Ask Sila Anything** application.

---

## 1. Project Overview & Tech Stack
- **Application**: "Ask Sila Anything" (Interactive Q&A platform with Sila, real-time typing simulation, reactions, comments, design showcase, and admin dashboard).
- **Core Stack**: React 18 + Vite + Tailwind CSS + Framer Motion.
- **Backend / Storage**: Supabase Database & Realtime with automatic localStorage offline synchronization (`storage.js`).
- **Icons**: Iconsax React (`iconsax-react`) with Linear/Bold variants.
- **Audio Engine**: Zero-asset Web Audio API synthesizer (`utils/soundEffects.js`).

---

## 2. UI & Design System Invariants

### Typography
- **Headings (`<h1>` - `<h6>`)**: `"Racing Sans One", sans-serif`
- **Sila's Answers / Handwritten Notes**: `"Mali", cursive` (Use classes: `mali-regular`, `mali-medium`, `mali-semibold`)
- **Body & Controls**: System Sans / Inter / Outfit (`font-sans`, `font-semibold`, `font-bold`)

### Glassmorphism & Surface Tokens
Always use project design classes to maintain 100% visual consistency:
- **Main Glass Card**: `glass-shell` (Translucent blurred container with dynamic border and inner shadow)
- **Nested Glass Subcard**: `glass-subpane` (Inner cards for answers, comments, typing indicators)
- **Pill Action Buttons**: `theme-toggle-btn` (Pill button with hover backdrop and active press bounce)
- **Rounded Corners**: 
  - Standard containers: `rounded-2xl` or `rounded-3xl`
  - Floating badges & icon chips: `rounded-full`

### Color Palette
- **Primary / Action**: Cyan (`text-cyan-500`, `bg-cyan-500`, `hover:bg-cyan-400`, `border-cyan-500/30`)
- **Sila Answering / Typing State**: Amber (`text-amber-500`, `bg-amber-500/10`, `border-amber-500/30`)
- **Reactions**:
  - Heart (Love): `text-red-500` / `fill-red-500`
  - Haha: `text-amber-500`
  - Think: `text-indigo-400`
  - Wow: `text-cyan-500`
  - Fire: `text-orange-500`

---

## 3. Motion & Audio Feedback Guidelines

### Motion & Modal Guidelines
- **Center Dialog Modals** (`BuyMeCoffeeModal`, `ThankYouModal`, `DeleteConfirmModal`, `AdminAuthModal`):
  - **Animation**: Open from top to center (`-translate-y-[100vh]` $\rightarrow$ `translate-y-0 scale-100`) and close by exiting to bottom (`translate-y-[100vh] scale-95`) with `duration-500 ease-in-out`.
  - **Close Button**: Do **NOT** generate close icons on the top right. Modals dismiss via backdrop tap, ESC key, or action buttons.
- **Bottom Sheet Modals** (`ShareModal`, `CommentModal`, `NotifySheetModal`):
  - Slide up from bottom with top drag handle indicator.

### Sound Synthesizer (`utils/soundEffects.js`)
All sound effects are synthesized dynamically via Web Audio API:
- `sounds.playPop(freq)`: Crisp, bubbly emoji reaction pop.
- `sounds.playUnreact()`: Warm descending de-activation tone when removing a reaction.
- `sounds.playHoverTick(freq)`: Micro tick when swiping across emoji options on mobile.
- `sounds.playSparkle()`: Harmonic shimmering sparkle when liking Sila's answer.
- `sounds.playSuccess()`: Uplifting 4-note chord when submitting questions/comments.
- `sounds.playClick()`: Subtle tab or filter switch click.

### Reaction & Burst Mechanics
- Use `<ReactionButton />` (`components/ReactionButton.jsx`) for all reaction interactions (questions, answers, comments).
- When reacting $\rightarrow$ trigger `triggerEmojiBurst(x, y, emoji)` + `sounds.playPop()`.
- When unreacting $\rightarrow$ play `sounds.playUnreact()` and **NEVER** trigger `triggerEmojiBurst` (keep unreact clean with zero particles).

---

## 4. Mobile & Touch Guidelines
- **Swipe-to-Select**: Always support smooth finger swiping on mobile using geometric proximity detection.
- **Ghost Click Prevention**: Avoid synthetic click double-firing on mobile touch endpoints.
- **Viewport Bounds**: Clamp floating popups and dropdowns so they never overflow off small mobile screens.

---

## 5. Security Invariants: Zero Hardcoded Sensitive Values

Agents and contributors must strictly enforce:
- **Never commit production URLs**: Base URLs (Render, Vercel, Supabase, Neon) must NEVER be hardcoded into `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, or `.yaml` files. All API endpoints must resolve strictly from environment variables (`VITE_API_URL`, `CLIENT_URL`, `DATABASE_URL`).
- **Never commit personal emails or identities**: Personal emails must NEVER appear as default values, string fallbacks (`|| "..."`), UI placeholders, example text, or in SQL migration scripts. Always use generic placeholders like `admin@example.com` or `"Enter registered admin email..."`.
- **Zero Fallback Secrets**: Secrets, tokens, and credentials (e.g. `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) must NEVER have hardcoded fallback strings. If missing, fail fast with a clear startup error.
- **Deployment Manifests**: In `render.yaml`, use `sync: false` for all secrets and variables so they are supplied via the dashboard, never checked into version control. In `vercel.json`, keep rewrites generic.
