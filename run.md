# 🚀 How to Run StoryBook AI — Complete Guide

This guide walks you through **every step** required to run the StoryBook AI project locally on your machine.

---

## 📋 Table of Contents

1. [Prerequisites](#1--prerequisites)
2. [Clone & Navigate](#2--clone--navigate)
3. [Install Dependencies](#3--install-dependencies)
4. [Environment Variables](#4--environment-variables)
5. [Database Setup](#5--database-setup)
6. [Run the Project](#6--run-the-project)
7. [Available Scripts](#7--available-scripts)
8. [Project URLs](#8--project-urls)
9. [Project Structure](#9--project-structure)
10. [Utility Scripts](#10--utility-scripts)
11. [Troubleshooting](#11--troubleshooting)

---

## 1. 📦 Prerequisites

Make sure the following are installed on your machine **before** you begin:

| Tool             | Required Version | How to Check         | Download Link                                      |
| ---------------- | ---------------- | -------------------- | -------------------------------------------------- |
| **Node.js**      | `>= 22.11.0`     | `node -v`            | [nodejs.org](https://nodejs.org/)                   |
| **npm**          | `>= 10.8.2`      | `npm -v`             | Ships with Node.js                                 |
| **Git**          | Any recent       | `git --version`      | [git-scm.com](https://git-scm.com/)               |
| **PostgreSQL**   | Any recent       | `psql --version`     | [postgresql.org](https://www.postgresql.org/)      |

### Optional (but recommended)

| Tool         | Purpose                        | Download Link                                  |
| ------------ | ------------------------------ | ---------------------------------------------- |
| **nvm**      | Manage Node.js versions easily | [nvm-sh/nvm](https://github.com/nvm-sh/nvm)   |
| **Redis**    | Caching (backend)              | [redis.io](https://redis.io/)                  |

> **Tip (nvm users):** The project includes an `.nvmrc` file pinned to `22.11.0`. Run `nvm use` in the project root to automatically switch to the correct Node version.

---

## 2. 📁 Clone & Navigate

```bash
git clone <your-repo-url>
cd StoryBook-AI
```

> ⚠️ **Important:** All commands below must be run from the `StoryBook-AI/` root directory — **not** from a parent folder. The `package.json` lives inside `StoryBook-AI/`.

---

## 3. 📥 Install Dependencies

```bash
npm install
```

This single command installs dependencies for **all** workspaces in the monorepo:

- `apps/web` — Next.js frontend
- `apps/backend` — Express backend
- `packages/db` — Prisma database package
- `packages/ui` — Shared UI components
- `packages/common` — Shared utilities
- `packages/eslint-config` — Shared ESLint config
- `packages/typescript-config` — Shared TypeScript config

---

## 4. 🔐 Environment Variables

The project uses `.env` files at **two levels**: root and per-app.

### 4.1 Root `.env` (StoryBook-AI/.env)

Create a `.env` file in the project root with the following variables:

```env
# Authentication (Clerk)
CLERK_JWT_PUBLIC_KEY="your_clerk_jwt_public_key"
CLERK_SECRET_KEY="your_clerk_secret_key"
CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"

# AI Services
FAL_KEY="your_fal_ai_key"
ELEVENLABS_API_KEY="your_elevenlabs_api_key"
AI_API_KEY="your_ai_api_key"

# Infrastructure
CLOUDFLARE_API_TOKEN="your_cloudflare_api_token"

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/storybook_ai"
```

### 4.2 Backend `.env` (apps/backend/.env)

Create or edit `apps/backend/.env`. Use `apps/backend/.env.example` as a reference for all available variables:

```env
# --- REQUIRED ---
CLERK_JWT_PUBLIC_KEY="your_clerk_jwt_public_key"
FAL_KEY="your_fal_ai_key"
DATABASE_URL="postgresql://username:password@localhost:5432/storybook_ai"

# --- OPTIONAL (with defaults) ---
NODE_ENV="development"           # default: "development"
PORT=8080                        # default: 8080
LOG_LEVEL="info"                 # default: "info"

# Storage & CDN (S3-compatible)
S3_REGION="us-east-1"
S3_ACCESS_KEY="your_s3_access_key"
S3_SECRET_KEY="your_s3_secret_key"
BUCKET_NAME="your_bucket_name"
S3_ENDPOINT="your_s3_endpoint"
STORAGE_PUBLIC_URL="your_cdn_url"

# Payment Processing
STRIPE_SECRET_KEY="sk_test_your_stripe_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"
RAZORPAY_KEY_ID="your_razorpay_key"
RAZORPAY_KEY_SECRET="your_razorpay_secret"

# Redis (caching)
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD="your_redis_password"

# Monitoring
SENTRY_DSN="your_sentry_dsn"

# Email
RESEND_API_KEY="your_resend_key"

# Security
JWT_SECRET="your_jwt_secret"
ENCRYPTION_KEY="your_encryption_key"

# Application URLs
WEBHOOK_BASE_URL="https://your-domain.com"
FRONTEND_URL="http://localhost:3000"

# Feature Flags
ENABLE_STORY_TEMPLATES=true
ENABLE_AUDIO_NARRATION=false
ENABLE_PDF_EXPORT=true
ENABLE_SHARING=true
```

### 4.3 Frontend `.env.local` (apps/web/.env.local)

Create `apps/web/.env.local` for the Next.js frontend:

```env
# Clerk (required for authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
NEXT_PUBLIC_CLERK_JWT_TEMPLATE=""     # optional, leave empty if not using a custom JWT template

# Backend API URL
NEXT_PUBLIC_BACKEND_URL="http://localhost:8080"

# Stripe (required for payments)
NEXT_PUBLIC_STRIPE_KEY="pk_test_your_stripe_publishable_key"
```

> **Note:** If `DATABASE_URL` is not set in the backend, it falls back to a local SQLite file (`file:./dev.db`) for development.

---

## 5. 🗄️ Database Setup

### 5.1 Create the PostgreSQL database

```bash
# Connect to PostgreSQL
psql -U postgres

# Inside the psql shell:
CREATE DATABASE storybook_ai;
\q
```

### 5.2 Generate Prisma Client

```bash
npm run generate:db
```

This runs `npx prisma generate` inside the `packages/db` package, generating the Prisma Client from the schema.

### 5.3 Run Database Migrations

```bash
cd packages/db
npx prisma migrate deploy
cd ../..
```

### 5.4 (Optional) Seed the Database

```bash
cd packages/db
npx prisma db seed
cd ../..
```

### 5.5 (Optional) Push Schema Without Migrations

For quick development without creating migration files:

```bash
cd packages/db
npx prisma db push
cd ../..
```

---

## 6. ▶️ Run the Project

### Start everything (recommended)

```bash
npm run dev
```

This uses **TurboRepo** to start **all apps simultaneously**:

| App          | Description               | URL                                  |
| ------------ | ------------------------- | ------------------------------------ |
| **web**      | Next.js frontend (Turbopack) | [http://localhost:3000](http://localhost:3000) |
| **backend**  | Express API server        | [http://localhost:8080](http://localhost:8080) |

### Start apps individually

**Frontend only:**
```bash
cd apps/web
npm run dev
```

**Backend only:**
```bash
cd apps/backend
npm run dev
```

### Start production mode

```bash
# Frontend
npm run start:web

# Backend
npm run start:backend
```

---

## 7. 📜 Available Scripts

### Root-level scripts (`StoryBook-AI/package.json`)

| Script            | Command                    | Description                                       |
| ----------------- | -------------------------- | ------------------------------------------------- |
| `dev`             | `npm run dev`              | Start all apps in development mode via Turbo       |
| `build`           | `npm run build`            | Build all packages and apps via Turbo              |
| `lint`            | `npm run lint`             | Lint all packages and apps via Turbo               |
| `format`          | `npm run format`           | Format all `.ts`, `.tsx`, `.md` files with Prettier|
| `start:web`       | `npm run start:web`        | Start the web app in production mode               |
| `start:backend`   | `npm run start:backend`    | Start the backend in production mode               |
| `generate:db`     | `npm run generate:db`      | Generate Prisma Client from the schema             |

### Web app scripts (`apps/web/package.json`)

| Script        | Command                  | Description                                  |
| ------------- | ------------------------ | -------------------------------------------- |
| `dev`         | `next dev --turbopack --port 3000` | Start Next.js dev server with Turbopack |
| `build`       | `next build`             | Build the Next.js app for production         |
| `start`       | `next start`             | Start the production build                   |
| `lint`        | `next lint --max-warnings 0` | Lint with zero tolerance for warnings    |
| `check-types` | `tsc --noEmit`          | Type-check without emitting files            |

### Backend scripts (`apps/backend/package.json`)

| Script  | Command          | Description                         |
| ------- | ---------------- | ----------------------------------- |
| `dev`   | `ts-node index.ts` | Start the backend in dev mode     |
| `start` | `ts-node index.ts` | Start the backend                 |
| `build` | `tsc`            | Compile TypeScript to JavaScript    |

### Database scripts (`packages/db/package.json`)

| Script        | Command                        | Description                               |
| ------------- | ------------------------------ | ----------------------------------------- |
| `generate`    | `prisma generate`              | Generate Prisma Client                    |
| `migrate:dev` | `prisma migrate dev`           | Create and apply a new migration          |
| `db:push`     | `prisma db push`               | Push schema to DB without migrations      |
| `db:seed`     | `npx ts-node prisma/seed.ts`   | Seed the database with initial data       |
| `build`       | `tsc && prisma generate`       | Compile TS and generate Prisma Client     |

---

## 8. 🌐 Project URLs

Once running, these are the key URLs:

| Service            | URL                                              |
| ------------------ | ------------------------------------------------ |
| Frontend (Web App) | [http://localhost:3000](http://localhost:3000)     |
| Backend API        | [http://localhost:8080](http://localhost:8080)     |
| Health Check       | [http://localhost:8080/healthz](http://localhost:8080/healthz) |

---

## 9. 🏗️ Project Structure

```
StoryBook-AI/
├── apps/
│   ├── web/                    # Next.js frontend (SaaS dashboard)
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # React components
│   │   ├── features/           # Feature-specific modules
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utility libraries
│   │   ├── services/           # API service clients
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Helper utilities
│   │   ├── middleware.ts       # Clerk auth middleware
│   │   ├── next.config.js      # Next.js configuration
│   │   └── package.json
│   │
│   └── backend/                # Express backend API
│       ├── src/
│       │   ├── config/         # Environment & app config
│       │   ├── lib/            # Core libraries (logger, startup)
│       │   ├── middleware/     # Express middleware
│       │   ├── models/         # Data models
│       │   ├── routes/         # API route handlers
│       │   ├── services/       # Business logic services
│       │   ├── app.ts          # Express app setup
│       │   └── server.ts       # Server entry point
│       ├── index.ts            # Main entry point
│       ├── .env.example        # Environment template
│       └── package.json
│
├── packages/
│   ├── db/                     # Database package
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Prisma schema (PostgreSQL)
│   │   │   ├── migrations/     # Database migrations
│   │   │   └── seed.ts         # Database seed script
│   │   └── package.json
│   │
│   ├── ui/                     # Shared UI components (shadcn)
│   ├── common/                 # Shared utilities
│   ├── eslint-config/          # Shared ESLint configuration
│   └── typescript-config/      # Shared TypeScript configuration
│
├── scripts/                    # Utility scripts
│   ├── create-test-user.ts     # Create a test user
│   ├── fix-database.ts         # Fix database issues
│   ├── fix-null-userid.ts      # Fix null user IDs
│   └── updateCredits.ts        # Update user credits
│
├── .env                        # Root environment variables
├── .nvmrc                      # Node.js version (22.11.0)
├── turbo.json                  # TurboRepo pipeline configuration
├── tsconfig.json               # Root TypeScript configuration
└── package.json                # Root package.json (workspaces)
```

---

## 10. 🔧 Utility Scripts

The `scripts/` directory contains one-off utility scripts:

```bash
# Create a test user in the database
npx ts-node scripts/create-test-user.ts

# Fix database issues
npx ts-node scripts/fix-database.ts

# Fix null userId references
npx ts-node scripts/fix-null-userid.ts

# Update user credits
npx ts-node scripts/updateCredits.ts
```

---

## 11. 🛠️ Troubleshooting

### ❌ `ENOENT: Could not read package.json`
**Cause:** You're running commands from the wrong directory.
**Fix:** Make sure you `cd` into `StoryBook-AI/` first.
```bash
cd StoryBook-AI
npm run dev
```

### ❌ `Invalid environment configuration`
**Cause:** Required environment variables are missing.
**Fix:** Ensure at minimum these are set in `apps/backend/.env`:
- `CLERK_JWT_PUBLIC_KEY`
- `FAL_KEY`

### ❌ `Node.js version mismatch`
**Cause:** Your Node.js version is below `22.11.0`.
**Fix:**
```bash
nvm install 22.11.0
nvm use 22.11.0
```

### ❌ `Prisma Client not generated`
**Cause:** Prisma Client hasn't been generated yet.
**Fix:**
```bash
npm run generate:db
```

### ❌ `Database connection refused`
**Cause:** PostgreSQL is not running or `DATABASE_URL` is incorrect.
**Fix:**
1. Start PostgreSQL
2. Verify your `DATABASE_URL` is correct
3. Make sure the database exists

### ❌ `Port 3000 or 8080 already in use`
**Cause:** Another process is using the port.
**Fix (Windows):**
```powershell
# Find the process using port 3000
netstat -ano | findstr :3000
# Kill the process (replace <PID> with the actual process ID)
taskkill /PID <PID> /F
```

### ❌ Turbo cache issues
**Fix:** Clear the Turbo cache and restart:
```bash
# Delete the .turbo cache directory
rm -rf .turbo
npm run dev
```

---

## ⚡ Quick Start (TL;DR)

```bash
# 1. Navigate to the project
cd StoryBook-AI

# 2. Install dependencies
npm install

# 3. Set up environment variables (see section 4)

# 4. Generate Prisma Client
npm run generate:db

# 5. Run migrations
cd packages/db && npx prisma migrate deploy && cd ../..

# 6. Start everything
npm run dev
```

The frontend runs at **http://localhost:3000** and the backend API at **http://localhost:8080**. 🎉
