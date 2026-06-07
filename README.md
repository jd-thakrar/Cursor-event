# ✦ Component Builder

> **Describe any UI in plain English → get production-ready React + Tailwind code with a live preview — instantly.**

Built with **Next.js 16**, **Llama 3.3 70B via Groq**, and `react-live` for real-time component rendering.

---

## ✨ Features

- 🧠 **AI-Powered Generation** — Describe any UI and get clean, production-ready React + Tailwind JSX code
- ⚡ **Live Preview** — Components render in real-time inside a sandboxed preview panel
- 💬 **Chat Interface** — Multi-turn conversation context for iterative component refinement
- 🔄 **Streaming Responses** — Token-by-token streaming via Server-Sent Events (SSE)
- 📋 **Copy Code** — One-click copy of the generated component code
- 🔌 **Multi-Provider Fallback** — Supports Groq (Llama), OpenAI, and Cursor SDK with automatic fallback
- 💡 **Example Prompts** — Pre-built example prompts to get started quickly

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| AI Model | Llama 3.3 70B (via Groq) |
| Live Preview | `react-live` |
| Icons | `lucide-react` |
| Streaming | Server-Sent Events (SSE) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A **Groq API key** (free at [console.groq.com](https://console.groq.com)) — OR an OpenAI / Cursor Pro key

### 1. Clone the repository

```bash
git clone https://github.com/jd-thakrar/Cursor-event.git
cd Cursor-event
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root of the project:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and add your API key:

```env
# Option 1 — Groq (Recommended, free tier available)
GROQ_API_KEY=your_groq_api_key_here

# Option 2 — OpenAI
# OPENAI_API_KEY=your_openai_api_key_here

# Option 3 — Cursor SDK (requires Cursor Pro plan)
# CURSOR_API_KEY=your_cursor_api_key_here
```

> **Note:** Only one key is required. Groq is the recommended option as it has a free tier and is very fast.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 How It Works

1. **User types a prompt** describing the UI component they want to build
2. **The prompt is sent** to the `/api/generate` route via a POST request
3. **The backend** calls the Groq API (or fallback provider) and **streams** the response token-by-token using SSE
4. **The frontend** receives the stream, extracts the JSX code from the response, and updates the **live preview** in real time using `react-live`
5. Users can **switch between Preview and Code tabs**, copy the code, and **iterate** with follow-up prompts

### Provider Priority

```
Cursor SDK (Pro) → Groq (Llama 3.3) → OpenAI (GPT-4)
```

The app automatically falls back to the next available provider if the primary one fails.

---

## 🌐 Deployment (Vercel)

This project is ready to deploy on Vercel with zero configuration.

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your repo
3. In **Environment Variables**, add your API key(s) from `.env.local`
4. Click **Deploy** ✅

---

## 📁 Project Structure

```
my-app/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.ts       # Streaming API route (SSE)
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main page
├── components/
│   ├── ComponentBuilder.tsx   # Main chat + preview UI
│   └── LivePreview.tsx        # react-live sandboxed renderer
├── lib/
│   ├── generate.ts            # Groq / OpenAI / Cursor SDK logic
│   ├── extract-code.ts        # JSX extraction from LLM output
│   ├── prompts.ts             # System prompts
│   └── example-prompts.ts     # Example prompt list
├── .env.local.example         # Environment variable template
└── README.md
```

---

## 💡 Example Prompts

- *"Build a SaaS pricing section with 3 tiers, monthly/yearly toggle, and feature lists"*
- *"Create a dark-themed dashboard with a sidebar, stats cards, and a line chart"*
- *"Design a login form with email/password fields, social login buttons, and animations"*
- *"Make a Kanban board with 3 columns and drag-and-drop-style cards"*

---

## 📄 License

MIT © [Jeet Thakrar](https://github.com/jd-thakrar)
