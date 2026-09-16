# 🌙 Storybook AI  
AI-powered personalized bedtime stories for kids

Storybook AI is a production-grade SaaS platform that generates personalized bedtime stories for children using AI.  
Each child becomes the hero of their own story through custom **FLUX LoRA training**, with consistent characters, illustrations, and narrated audio.

The platform is built as a **TurboRepo monorepo**, with a modern SaaS dashboard, scalable backend, and AI services designed for real-world production use.

---

## ✨ Features tested

- 🧒 Personalized child heroes using FLUX LoRA training
- 📖 AI-generated bedtime stories (safe, age-appropriate)
- 🎨 Illustrated story pages with character consistency
- 🔊 Story narration using **ElevenLabs** (natural voice TTS)
- 🧠 Custom prompts and emotion-aware storytelling
- 🔐 Secure authentication with **Clerk**
- 📊 Professional SaaS dashboard for parents
- ☁️ Cloudflare-powered infrastructure
- 🏗 Production-ready monorepo architecture

---

## 🧠 How It Works

1. Parents upload child images
2. Images are used to train a **FLUX LoRA** model
3. The trained model represents the child as a story hero
4. AI generates:
   - A bedtime story
   - Matching illustrations
   - Voice narration via ElevenLabs
5. Stories are stored and accessible anytime from the dashboard

---

## 🏗 Monorepo Architecture (TurboRepo)

This project uses **TurboRepo** to manage multiple apps and shared packages efficiently.
```
storybook-ai/
├── apps/
│ ├── web/ # Next.js frontend (SaaS dashboard)
│ └── backend/ # Express backend API
│
├── packages/
│ ├── ui/ # Shared UI components (shadcn + Tailwind)
│ ├── config/ # Shared configs (TS, ESLint, Tailwind)
│ ├── utils/ # Shared utilities and helpers
│ └── db/ # Database package
│ └── prisma/ # Prisma schema & migrations
│
├── turbo.json # TurboRepo pipeline configuration
├── package.json
└── README.md

```
---

## 🛠 Tech Stack

### Frontend (`apps/web`)
- Next.js (TypeScript)
- Tailwind CSS
- shadcn/ui
- App Router
- Professional SaaS dashboard layout
- Responsive and accessible UI

### Backend (`apps/backend`)
- Node.js
- Express
- Prisma ORM
- PostgreSQL
- REST-based API architecture

### Authentication
- Clerk

### AI & Media
- FLUX LoRA (custom character training)
- AI text generation for stories
- AI image generation for illustrations
- **ElevenLabs** for story narration (Text-to-Speech)

### Infrastructure
- Cloudflare (CDN, security, edge delivery)

---

## 📊 SaaS Dashboard

The platform includes a professional SaaS dashboard that allows parents to:

- Manage child profiles
- Upload training images
- Generate and view stories
- Listen to narrated bedtime stories
- Access story history
- Manage subscriptions (payment-ready architecture)

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL
- Clerk account
- ElevenLabs account
- Cloudflare account
- FLUX LoRA training setup

---

### Install Dependencies

```

npm install

Environment Variables

Create a .env file (or per-app env files):

DATABASE_URL=postgresql://user:password@localhost:5432/storybook

CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

ELEVENLABS_API_KEY=your_elevenlabs_api_key
AI_API_KEY=your_ai_provider_key

CLOUDFLARE_API_TOKEN=your_cloudflare_token

Database Setup

npx prisma migrate deploy
npx prisma generate

Run the Monorepo

npm run dev

This will start:

    Frontend: apps/web

    Backend API: apps/backend

```


## 🧪 Production Readiness

- Type-safe database access with Prisma  
- Secure authentication and authorization  
- TurboRepo-powered builds and caching  
- AI services isolated from core business logic  
- CDN-backed frontend delivery  
- SaaS-ready architecture  

---

## 🔒 Privacy & Safety

- Child images are handled securely  
- Trained LoRA models are private and isolated  
- Age-appropriate content filtering  
- Privacy-first system design  

---

## 📈 Roadmap

- Multi-language story generation  
- Voice selection and emotional tones (ElevenLabs)  
- Parent-controlled story customization  
- Mobile app (React Native)  
- Offline story downloads  
- Analytics and usage insights  
- Community story sharing (opt-in)  

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository  
2. Create a new branch  
3. Commit your changes  
4. Open a pull request  

Please follow clean code and security best practices.

---

## 📄 License

MIT License

---

## 🌟 Vision

To make bedtime magical, personal, and unforgettable —  
where every child is the hero of their own story.

