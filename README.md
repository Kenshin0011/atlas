# ATLAS

**A**ttention **T**emporal **L**ink **A**nalysis **S**ystem

Multi-Scale Dependency Detection for Real-Time Conversation Support

---

## 🎯 Overview

ATLAS is an intelligent conversation assistant designed to help users stay engaged in meetings while multitasking. Using multi-scale temporal dependency analysis, ATLAS detects important utterances, recovers missing context, and provides smart notifications.

**CTIDE (Context-aware Temporal Information Detection Engine)** is the production-ready implementation with booth-based session management, multi-user support, and experiment data tracking.

### Key Features

- 🎤 **Web Speech API Integration** - Browser-native speech recognition (free)
- 🔗 **Multi-Scale Dependency Detection** - Local, Topical, and Global (foreshadowing) dependencies
- 🔔 **Smart Notifications** - Context-aware alerts for important utterances
- 📝 **Context Recovery** - Catch-up summaries when you miss conversations
- 🧠 **Attention-Based Analysis** - Leverages LLM attention mechanisms
- ⚡ **Real-Time Processing** - Instant analysis as conversations happen
- 🏢 **Booth-Based Sessions** - Organize conversations by experiment booth
- 👥 **Multi-User Support** - Multiple users in same conversation with RLS policies
- 🔐 **Username Authentication** - Simple username-based auth via Supabase
- 📊 **Admin Dashboard** - Session management, statistics, and data export

---

## 🏗️ Architecture

```
atlas/
├── apps/
│   └── web/                           # Next.js application (@atlas/web)
│       ├── src/
│       │   ├── app/                  # App Router
│       │   │   ├── api/              # API Routes (Serverless)
│       │   │   ├── login/            # Login page
│       │   │   ├── ctide/            # CTIDE pages
│       │   │   │   ├── page.tsx      # Booth list
│       │   │   │   ├── booth/[id]/   # Conversation page
│       │   │   │   ├── sessions/     # Admin: Session management
│       │   │   │   └── debug/        # Admin: Debug viewer
│       │   │   └── middleware.ts     # Auth & admin protection
│       │   ├── features/             # Feature modules
│       │   │   └── ctide-assistant/  # CTIDE components & hooks
│       │   ├── lib/                  # Libraries
│       │   │   └── supabase/         # Supabase clients & helpers
│       │   ├── hooks/                # React hooks (useAuth, useAdmin)
│       │   ├── services/             # Business logic
│       │   └── types/                # Type definitions
│       ├── supabase/
│       │   └── migrations/           # Database schema migrations
│       └── package.json
│
└── packages/
    └── atlas-core/                    # Shared core library (@atlas/core)
        └── src/
            ├── algorithms/           # Core algorithms
            ├── format/               # Time formatting
            ├── math/                 # Mathematical functions
            ├── temporal/             # Temporal decay
            ├── text/                 # Text processing
            └── types.ts              # Type definitions
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18 (推奨: 23.6.1)
- pnpm >= 8
- OpenAI API Key
- Supabase Project (for authentication and database)

### Installation

```bash
# Clone and navigate
cd atlas

# Node.jsバージョンを設定（nvmを使用する場合）
nvm use

# または（asdfを使用する場合）
asdf install

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local and add:
# - OPENAI_API_KEY
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_ADMIN_USERNAMES (comma-separated, optional)
```

### Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. In Supabase Dashboard → Authentication → Settings:
   - **Disable** "Confirm email" (email confirmation not needed)
3. Run migrations:
   ```bash
   cd apps/web
   # Apply migrations to your Supabase project
   ```
4. Copy your project URL and anon key to `.env.local`

### Development

```bash
# Run Next.js dev server with Turbo
pnpm dev

# Open http://localhost:3000
```

### Build

```bash
# Build for production
pnpm build
```

---

## 👤 User Flow

### 1. **Login** (`/login`)
- Enter username (3+ characters, alphanumeric, `_`, `-`)
- Create account or sign in
- Redirected to booth list

### 2. **Create Booth** (`/ctide`)
- Enter booth name (e.g., "Experiment A - Condition 1")
- Click "Create Booth"
- Automatically creates new session

### 3. **Conversation** (`/ctide/booth/[id]`)
- Click "Start" to begin speech recognition
- System automatically detects:
  - Important utterances (highlighted in green)
  - Temporal dependencies (visual links)
  - Conversation anchors
- Click "Stop" to pause recording
- Click "Clear" to reset conversation

### 4. **Admin Dashboard** (`/ctide/sessions`) - Admin Only
- View all sessions with:
  - Booth name
  - Username
  - Utterance count
  - Important utterance count
  - Average score
- Export data as JSON or CSV
- Click "表示" to open debug viewer

---

## 📊 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 + React 19 + Tailwind CSS |
| **Authentication** | Supabase Auth (cookie-based SSR) |
| **Database** | PostgreSQL (via Supabase) |
| **Speech Recognition** | Web Speech API (Browser) |
| **Embeddings** | OpenAI text-embedding-3-small |
| **Hosting** | Vercel (Serverless) |
| **Build System** | Turborepo + pnpm workspaces |
| **Code Quality** | Biome (linter/formatter) |

### Database Schema

- **sessions**: Booth-based conversation sessions
  - `id`, `created_at`, `user_id`, `username`, `notes` (booth name), `tags`, `experiment_params`
- **utterances**: Individual utterances in conversations
  - `id`, `session_id`, `user_id`, `username`, `speaker`, `text`, `timestamp`
- **dependencies**: Detected temporal dependencies
  - `id`, `session_id`, `from_utterance_id`, `to_utterance_id`, `weight`, `type`
- **important_utterances**: Flagged important utterances
  - `id`, `session_id`, `utterance_id`, `importance_score`
- **session_stats**: Aggregated statistics (auto-updated view)

---

## 🔬 Core Algorithm: Multi-Scale Temporal Dependencies

ATLAS analyzes conversation dependencies across three temporal scales:

### 1. **Local Dependencies (Short-term)**
- Context: Last 1-3 utterances
- Method: Attention weights + Embedding similarity
- Decay: Exponential (λ = 0.5)
- Use case: Direct references, pronouns

### 2. **Topical Dependencies (Mid-term)**
- Context: Same topic segment (5-20 utterances)
- Method: Entity linking + Co-reference resolution
- Decay: Moderate (λ = 0.2)
- Use case: Continuous discussion, shared entities

### 3. **Global Dependencies (Long-term)**
- Context: Full conversation history
- Method: Temporal reference detection + LLM verification
- Decay: Minimal (λ = 0.05)
- Use case: Foreshadowing recovery ("さっき言ってた...")

### Mathematical Formulation

```
δ(ui, uj) = w_local · δ_local(ui, uj)
          + w_topic · δ_topic(ui, uj)
          + w_global · δ_global(ui, uj)

where each δ includes temporal decay:
δ_type(ui, uj) = score(ui, uj) · exp(-λ_type · (i - j))
```

---

## 💰 Cost Estimation

| Service | Monthly Cost |
|---------|--------------|
| Vercel Hobby | $0 (free tier) |
| Supabase Free Tier | $0 (500MB DB, 50k auth users) |
| Web Speech API | $0 (browser built-in) |
| OpenAI Embeddings | ~$2 (100k utterances) |
| OpenAI GPT-4 (optional) | ~$3 (100 calls) |
| **Total** | **~$0-5/month** |

---

## 🔧 Configuration

Edit `packages/atlas-core/src/types.ts` to customize detection parameters:

```typescript
export const DEFAULT_CONFIG: DetectionConfig = {
  scain_threshold: 0.5,      // Dependency detection threshold
  w_local: 0.5,              // Local dependency weight
  w_topic: 0.3,              // Topical dependency weight
  w_global: 0.2,             // Global dependency weight
  lambda_local: 0.5,         // Local temporal decay rate
  lambda_topic: 0.2,         // Topical temporal decay rate
  lambda_global: 0.05,       // Global temporal decay rate
};
```

---

## 📖 Research Background

ATLAS builds upon SCAIN (Semantically Contextualized and Indispensable Nuance) research, extending it with:

1. **Multi-scale temporal modeling** - Beyond immediate context
2. **Foreshadowing detection** - Long-range dependency recovery
3. **Attention mechanism integration** - Leveraging Transformer attention
4. **User-centric importance scoring** - Personalized notifications

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

- Original SCAIN concept from conversation analysis research
- Built with Next.js, OpenAI, and Vercel
- Web Speech API by W3C/Chrome team
