# ATLAS

**A**ttention **T**emporal **L**ink **A**nalysis **S**ystem

Multi-Scale Dependency Detection for Real-Time Conversation Support

---

## 🎯 Overview

ATLAS is an intelligent conversation assistant designed to help users stay engaged in meetings while multitasking. Using multi-scale temporal dependency analysis, ATLAS detects important utterances, recovers missing context, and provides smart notifications.

### Key Features

- 🎤 **Web Speech API Integration** - Browser-native speech recognition (free)
- 🔗 **Multi-Scale Dependency Detection** - Local, Topical, and Global (foreshadowing) dependencies
- 🔔 **Smart Notifications** - Context-aware alerts for important utterances
- 📝 **Context Recovery** - Catch-up summaries when you miss conversations
- 🧠 **Attention-Based Analysis** - Leverages LLM attention mechanisms
- ⚡ **Real-Time Processing** - Instant analysis as conversations happen

---

## 🏗️ Architecture

```
atlas/
├── apps/
│   └── web/                    # Next.js application (@atlas/web)
│       ├── src/
│       │   ├── app/           # App Router
│       │   │   ├── api/       # API Routes (Serverless)
│       │   │   ├── page.tsx   # Main conversation interface
│       │   │   └── layout.tsx
│       │   ├── components/    # React components
│       │   └── lib/           # Client utilities
│       └── package.json
│
└── packages/
    └── atlas-core/             # Shared core library (@atlas/core)
        └── src/
            ├── types.ts        # Type definitions
            ├── utils.ts        # Utility functions
            └── index.ts
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- OpenAI API Key

### Installation

```bash
# Clone and navigate
cd atlas

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local and add your OPENAI_API_KEY
```

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

## 📊 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 + React 19 + Tailwind CSS |
| **Speech Recognition** | Web Speech API (Browser) |
| **LLM** | OpenAI GPT-4 |
| **Embeddings** | OpenAI text-embedding-3-small |
| **Hosting** | Vercel (Serverless) |
| **Build System** | Turborepo + pnpm workspaces |

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
