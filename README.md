# Ask Sila Anything

[![wakatime](https://wakatime.com/badge/user/6fa73df2-a15a-4bf9-9e30-165242109616/project/ad5bad6c-a934-4da2-bf8f-cf6d12b4350a.svg)](https://wakatime.com/badge/user/6fa73df2-a15a-4bf9-9e30-165242109616/project/ad5bad6c-a934-4da2-bf8f-cf6d12b4350a)

An interactive, real-time anonymous Q&A web platform, two-way Telegram answering engine, and social media story creator built with **React**, **Node.js**, **Express**, **Drizzle ORM**, and **Neon Serverless PostgreSQL**.

---

## ✨ Features & Highlights

### 💬 Interactive Q&A Community Feed
- **Anonymous Submissions**: Anyone can submit questions anonymously with instant feedback and rate limiting protection.
- **Curiosity Unlock Mechanic**: Interactive gamified unlock that reveals the community question feed once an inquiry is submitted.
- **Live Typing Simulation**: Real-time typing indicators mimicking Sila composing answers.
- **Micro-Interactions & Reaction Bursts**: 5 expressive reaction buttons (Heart, Haha, Think, Wow, Fire) with physics-based emoji bursts and synthesized Web Audio pops.
- **Nested Discussions**: Threaded comments on individual questions with live updates and reaction support.

### 🤖 Telegram Two-Way Answering Engine
- **Instant Admin Notifications**: Sends formatted question alerts directly to Sila's private Telegram chat.
- **Swipe-to-Reply Answering**: Answering a question is as simple as swiping reply in Telegram. The reply text instantly publishes to the database and frontend.
- **Bot Commands**:
  - `/pending`: Inspect unanswered questions and reply directly.
  - `/status`: Real-time system health, database connection latency, and queue counters.
- **Dual Polling & Webhook Architecture**: Background long-poller for local development with webhook endpoints for production deployments.

### 🔐 Hardened Admin & 2FA Security
- **Multi-Factor Telegram OTP**: Admin login requires password plus a 6-digit OTP code sent directly via Telegram.
- **Telegram Password Reset**: Forgotten passwords can be reset via a verified 6-digit Telegram reset challenge.
- **Rate-Limited & Sanitized**: Strict rate limiting on auth, questions, and comments with input sanitization and secure HttpOnly cookie sessions.

### 🎨 Visual Story Studio
- **Social Story Card Generator**: Generates high-resolution branded story graphics combining questions with handwritten Mali cursive typography.
- **1-Click Export**: Instant high-res image download, direct clipboard copy, and quick share links for Instagram and Facebook Stories.
- **Dynamic Theming**: Real-time theme customization with light/dark glassmorphic design palettes.

### 🎵 Zero-Asset Audio Engine
- **Procedural Audio**: 100% synthesized in-browser using the Web Audio API — zero sound file downloads, zero lag.
- **Custom Soundscapes**: Distinct frequencies for reaction pops, unreact descending tones, swipe ticks, sparkles, and chord chimes.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) | High-performance SPA with client-side routing |
| **Styling & Design** | [Tailwind CSS](https://tailwindcss.com/) | Custom glassmorphism design system (`glass-shell`, `glass-subpane`) |
| **Motion & Animation** | [Framer Motion](https://www.framer.com/motion/) | Smooth UI physics, modal transitions, and reaction particles |
| **Iconography** | [Iconsax React](https://iconsax-react.pages.dev/) | Modern linear and bold variant icons |
| **Audio Synthesizer** | Web Audio API | Zero-asset dynamic sound synthesizer (`soundEffects.js`) |
| **Backend API** | [Node.js](https://nodejs.org/) (v22 LTS) + [Express](https://expressjs.com/) | RESTful API server with rate limiting and security headers |
| **Database & ORM** | [Neon Postgres](https://neon.tech/) + [Drizzle ORM](https://orm.drizzle.team/) | Serverless PostgreSQL over WebSockets (`ws`) with type-safe schema |
| **Bot & Notifications** | Telegram Bot API | Two-way swipe replies, queue management, and 2FA OTP |
| **Containerization** | [Docker](https://www.docker.com/) | Lightweight Alpine Linux multi-stage container |

---

## 📁 Project Structure

```text
ask-sila-anything/
├── backend/
│   ├── src/
│   │   ├── config/        # Environment variables & startup validation
│   │   ├── controllers/   # Auth, questions, comments, designs, telegram logic
│   │   ├── db/            # Drizzle ORM schema, migrations & Neon connection pool
│   │   ├── middleware/    # Auth verification & express-rate-limit guards
│   │   ├── routes/        # Express REST route definitions
│   │   ├── services/      # Telegram poller and webhook handlers
│   │   ├── utils/         # Password hashing, JWT, OTP & Telegram messaging
│   │   ├── app.js         # Express app configuration & CORS setup
│   │   └── server.js      # Server entry point & DB connection check
│   ├── Dockerfile         # Production Node 22 Alpine Docker container
│   └── package.json       # Backend scripts & dependencies
├── frontend/
│   ├── src/
│   │   ├── assets/        # Static brand assets & logos
│   │   ├── components/    # Reusable glass UI components, modals, reactions
│   │   ├── hooks/         # Custom React hooks (theming, audio, sound)
│   │   ├── lib/           # REST apiClient, admin auth & offline storage layer
│   │   ├── pages/         # Story Studio, public feed, and admin views
│   │   └── utils/         # Web Audio synthesizer & date formatters
│   ├── vercel.json        # Vercel SPA routing configuration
│   └── package.json       # Frontend scripts & dependencies
├── .agents/               # Agent rules, workflows, and architecture standards
├── AGENTS.md              # Single source of truth for design tokens & coding rules
├── render.yaml            # Render Web Service blueprint manifest
└── package.json           # Root workspace scripts (concurrent dev & tools)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20 or higher (v22+ recommended)
- **npm** (or `pnpm` / `yarn`)
- A **Neon PostgreSQL** database instance ([neon.tech](https://neon.tech/))
- A **Telegram Bot Token** from [@BotFather](https://t.me/botfather)

---

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/sila911/ask-sila.git
cd ask-sila

# Install root, backend, and frontend dependencies
npm install
npm install --prefix backend
npm install --prefix frontend
```

---

### 2. Configure Environment Variables

#### Backend (`backend/.env`):
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://<user>:<password>@<neon-hostname>/ask_sila?sslmode=require
JWT_SECRET=your_super_secret_jwt_key
ADMIN_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=your_initial_admin_password
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

#### Frontend (`frontend/.env`):
Create a `.env` file in the `frontend/` directory (optional for local dev, Vite automatically proxies `/api` to port 5000):

```env
# Optional: In development, defaults to relative /api proxied to http://localhost:5000
VITE_API_URL=
```

---

### 3. Initialize Database Schema

Push the Drizzle ORM schema to your Neon PostgreSQL database:

```bash
npm --prefix backend run db:push
```

Seed the initial admin user account:

```bash
npm --prefix backend run seed:admin
```

---

### 4. Run Development Servers

Start both the backend API and frontend Vite dev server concurrently with one command:

```bash
npm run dev
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **API Health Check**: `http://localhost:5000/health`

---

## 📜 Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs backend (nodemon) and frontend (Vite) concurrently |
| `npm run dev:backend` | Starts only the backend API in watch mode |
| `npm run dev:frontend` | Starts only the frontend Vite development server |
| `npm run build` | Builds the frontend production bundle into `frontend/dist` |
| `npm run preview` | Previews the production frontend build locally |
| `npm run clean:ports` | Frees up ports `5000` and `5173` if occupied by other processes |
| `npm --prefix backend run db:push` | Syncs Drizzle schema changes to Neon database |
| `npm --prefix backend run db:studio` | Launches visual Drizzle Studio web GUI for database inspection |

---

## 🌐 Production Deployment

### Backend (Render Web Service)
1. Link the repository to [Render](https://render.com/).
2. Select **Docker** runtime (using `backend/Dockerfile`).
3. Set the following environment variables in the Render Dashboard:
   - `DATABASE_URL`: Your Neon Postgres connection string
   - `JWT_SECRET`: Random 64-character secret
   - `ADMIN_EMAIL`: Your registered admin email
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
   - `TELEGRAM_CHAT_ID`: Your Telegram chat ID
   - `CLIENT_URL`: Your frontend production domain

### Frontend (Vercel)
1. Link the repository to [Vercel](https://vercel.com/) with root directory set to `frontend`.
2. Set the following environment variable in the Vercel Dashboard:
   - `VITE_API_URL`: Your deployed Render backend URL (e.g. `https://<your-service>.onrender.com`)
3. Deploy!

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
