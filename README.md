# Ask Sila Anything

[![wakatime](https://wakatime.com/badge/user/6fa73df2-a15a-4bf9-9e30-165242109616/project/ad5bad6c-a934-4da2-bf8f-cf6d12b4350a.svg)](https://wakatime.com/badge/user/6fa73df2-a15a-4bf9-9e30-165242109616/project/ad5bad6c-a934-4da2-bf8f-cf6d12b4350a)

An interactive, real-time anonymous Q&A web platform and social media story creator built with **React**, **Tailwind CSS**, and **Supabase**.

---

## ✨ Features & Highlights

### 💬 Interactive Q&A

- **Anonymous Submissions**: Anyone can ask questions anonymously with instant submission feedback.
- **Curiosity Lock**: Interactive unlock mechanic that reveals the community question feed once an inquiry is submitted.
- **Real-Time Feed & Live Typing**: Real-time synchronization for new questions, answers, and live typing simulations.
- **Interactive Reactions & Audio**: Multi-reaction buttons (Heart, Haha, Think, Wow, Fire) with emoji particle bursts and synthesized Web Audio effects.
- **Rich Comments & Discussion**: Nested discussion threads with real-time updates and reaction feedback.

### 🎨 Visual Story Studio

- **High-Quality Story Card Generator**: Generates styled visual story graphics combining questions and handwritten-style answers.
- **Instant Export & Sharing**: 1-click high-resolution image download, direct clipboard copy, and quick share links for Instagram and Facebook Stories.
- **Dynamic Theming**: Customizable background gradients, typography, and card stylings.

### 💎 Design System & Micro-Interactions

- **Glassmorphism Aesthetic**: Translucent frosted glass cards (`glass-shell` and `glass-subpane`) with fluid light and dark mode toggling.
- **Curated Typography**: Headers rendered with **Racing Sans One** paired with handwritten **Mali** cursive for answers.
- **Zero-Asset Sound Synthesizer**: Procedural Web Audio API sound effects for pops, sparkles, tab clicks, and success chimes.
- **Mobile-First Responsive Layout**: Smooth gesture interactions, swipeable reactions, and touch-optimized bottom sheets.

---

## 🛠️ Tech Stack

| Layer                    | Technology                                                                   |
| :----------------------- | :--------------------------------------------------------------------------- |
| **Frontend Framework**   | [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)                 |
| **Styling & UI**         | [Tailwind CSS](https://tailwindcss.com/) + Custom Glassmorphism System       |
| **Motion & Animation**   | [Framer Motion](https://www.framer.com/motion/)                              |
| **Iconography**          | [Iconsax React](https://iconsax-react.pages.dev/)                            |
| **Audio Engine**         | Web Audio API Synthesizer (Zero asset dependencies)                          |
| **Backend as a Service** | [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Row Level Security) |

---

## 📁 Project Structure

```text
├── frontend/
│   ├── src/
│   │   ├── assets/        # Static imagery & brand assets
│   │   ├── components/    # Reusable UI cards, modals, sheets & reactions
│   │   ├── hooks/         # Custom React hooks (theming, audio, realtime)
│   │   ├── lib/           # Supabase client, storage layer & utilities
│   │   ├── pages/         # Application views & Story Studio
│   │   └── utils/         # Sound synthesizer & time formatters
│   └── package.json
├── package.json           # Root workspace scripts
└── supabase_setup.sql     # Database schema, tables, and RLS policies
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (or `pnpm` / `yarn`)
- A [Supabase](https://supabase.com/) project

### 1. Clone & Install

```bash
git clone https://github.com/sila911/ask-sila.git
cd ask-sila
npm install
npm install --prefix frontend
```

### 2. Configure Environment Variables

Create a `.env` file inside the `frontend/` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

### 3. Initialize Database

Execute the SQL statements from `supabase_setup.sql` in your Supabase SQL Editor to configure tables, indexes, and Row Level Security (RLS) policies.

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 📦 Production Build

To build the frontend for production:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
