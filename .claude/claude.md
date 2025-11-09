# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# ATLAS Project Guide

## Project Overview

**ATLAS (Attention Temporal Link Analysis System)** is a real-time conversation assistant that helps users follow conversations while multitasking. It uses multi-scale temporal dependency detection to identify important utterances and provide smart notifications.

## Architecture

### Monorepo Structure

```
atlas/
├── apps/
│   └── web/              # Next.js 15 + React 19 application
│       ├── src/
│       │   ├── app/      # App Router pages and API routes
│       │   ├── features/ # Feature modules
│       │   │   ├── components/ # UI components
│       │   │   └── hooks/      # Feature hooks (useStreamWithSupabase)
│       │   ├── hooks/    # Shared hooks (useAuth, useSpeechRecognition)
│       │   ├── lib/      # Libraries (supabase client, session management)
│       │   └── services/ # Business logic (embedding service)
│       └── package.json
└── packages/
    └── atlas-core/       # Shared core library
        ├── src/
        │   ├── analyzer/ # Importance detection algorithm
        │   │   ├── scoring/     # Score calculation
        │   │   ├── statistics/  # Statistical testing
        │   │   └── adapters/    # External service adapters
        │   ├── format/   # Time formatting utilities
        │   ├── types.ts  # Core type definitions
        │   └── index.ts  # Exports
        └── package.json
```

### Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime subscriptions)
- **Speech Recognition**: Web Speech API (browser-native, free)
- **AI/ML**: OpenAI text-embedding-3-small for semantic similarity
- **Build Tools**: Turbo (monorepo), pnpm (package manager)
- **Code Quality**: Biome (linter/formatter)
- **Deployment**: Vercel (serverless)

## Core Concepts

### Importance Detection Algorithm

ATLAS detects important utterances in real-time conversations using:

1. **Composite Scoring**: Combines individual similarity and contextual importance
   - **Individual Loss**: Direct semantic similarity between single utterance and current (cosine similarity of embeddings)
   - **Context Loss**: Importance when removed from full history context (masked loss - base loss)
   - **Formula**: `compositeDelta = α × individualDelta + (1-α) × contextDelta`
2. **Temporal Weighting**: Exponential decay based on distance (applied at scoring stage only)
3. **Masked Language Modeling**: Predicts current utterance from history using embeddings (equal weighting in adapter)
4. **Statistical Significance**: Uses permutation testing and p-value thresholding (α=0.1)

**Key Parameters:**
- `k`: Number of candidates to evaluate (default: 15)
- `halfLifeTurns`: Temporal decay half-life in turns (default: 50, relaxed to better capture early topic introductions)
- `nullSamples`: Number of null samples for permutation test (default: 20, auto-adjusted to min 3× candidates)
- `fdrAlpha`: False discovery rate threshold (default: 0.1)

### Temporal Decay Function

```typescript
ω(distance) = exp(-λ × distance)
λ = ln(2) / halfLifeTurns
```

Where:
- `distance`: Number of utterances between current and anchor
- `halfLifeTurns`: Number of turns for weight to decay to 50%

## Code Style Guide

### TypeScript

- **Use `type` instead of `interface`** for all type definitions
- **No `any` types** - Biome enforces this with `noExplicitAny: "error"`
- **Arrow functions only** - All functions should use arrow syntax
- **Explicit types** - Always provide return types for functions

### React

- **Client components**: Add `'use client'` directive at top
- **Button elements**: Always add `type="button"` attribute
- **SVG elements**: Include `role="img"` and `aria-label` for accessibility
- **useCallback/useMemo**: Use for functions/values passed to useEffect dependencies

### Imports

- Use path aliases: `@/` for `apps/web/src/`
- Import from `@atlas/core` for shared utilities
- Group imports: external → internal → types

### File Organization

- **One component per file**
- **Co-locate types** with components when component-specific
- **Shared types** go in `packages/atlas-core/src/types.ts`
- **Utility functions** in domain-specific directories (`format/`, `math/`, etc.)

## Common Commands

```bash
# Development
pnpm dev              # Start dev server (Turbo runs all packages)

# Code Quality
pnpm biome:fix        # Format and lint all files
pnpm format           # Format only (no lint fixes)

# Git
git add . && git commit -m "chore: message

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## API Routes

### POST /api/analyze

Analyzes a new utterance for importance detection.

**Request Body:**
```typescript
{
  history: Utterance[];  // Previous utterances
  current: Utterance;    // New utterance to analyze
  options?: {
    k?: number;
    halfLifeTurns?: number;
    nullSamples?: number;
    fdrAlpha?: number;
  };
}
```

**Response:**
```typescript
{
  important: Array<{
    id: number;
    text: string;
    score: number;
    rank: number;
    p?: number;
    detail: {
      baseLoss: number;
      maskedLoss: number;
      deltaLoss: number;
      ageWeight: number;
      finalScore: number;
    };
  }>;
  scored: Array</* same as important */>;
  anchorCount: number;
}
```

### Session Management Routes

- **GET /api/sessions**: List all sessions with statistics
- **GET /api/sessions/export**: Export sessions as JSON or CSV
- **GET /api/sessions/[sessionId]**: Get session utterances
- **GET /api/sessions/[sessionId]/scores**: Get session scores
- **POST /api/sessions/[sessionId]/clear**: Clear session data (keep session)
- **DELETE /api/sessions/[sessionId]/delete**: Delete entire session

## Key Files

### Core Logic

- **`apps/web/src/app/api/analyze/route.ts`**: Importance analysis API endpoint
- **`packages/atlas-core/src/analyzer/`**: Importance detection algorithm implementation
  - `analyzer.ts`: Main analysis orchestration
  - `anchor-memory.ts`: Anchor memory management
  - `scoring/`: Score calculation modules
  - `statistics/`: Statistical testing (permutation tests)
  - `diversify.ts`: MMR-based anchor selection
  - `null-samples.ts`: Null distribution generation
- **`apps/web/src/services/embeddingService.ts`**: OpenAI embeddings wrapper

### React Hooks

- **`apps/web/src/features/hooks/useStreamWithSupabase.ts`**: Main hook for Supabase-backed conversation stream
- **`apps/web/src/hooks/useSpeechRecognition.ts`**: Web Speech API wrapper
- **`apps/web/src/hooks/useAuth.ts`**: Supabase authentication
- **`apps/web/src/hooks/useAdmin.ts`**: Admin role detection

### UI Components (Features)

- **`apps/web/src/features/components/Assistant.tsx`**: Main booth conversation component
- **`apps/web/src/features/components/ConversationLayout.tsx`**: Layout with dependency visualization
- **`apps/web/src/features/components/ConversationStreamWithDependencies.tsx`**: Current utterance display
- **`apps/web/src/features/components/ImportantHighlights.tsx`**: Important utterances panel
- **`apps/web/src/features/components/DependencyMinimap.tsx`**: Visual dependency graph
- **`apps/web/src/features/components/DebugDashboard.tsx`**: Real-time debugging dashboard
- **`apps/web/src/features/components/DebugConversationView.tsx`**: Conversation with inline scores
- **`apps/web/src/features/components/SessionsManager.tsx`**: Admin session management

### Supabase Integration

- **`apps/web/src/lib/supabase/client.ts`**: Supabase client initialization
- **`apps/web/src/lib/supabase/session.ts`**: Session CRUD and real-time subscriptions
- **`apps/web/src/lib/supabase/username.ts`**: Email to username conversion

### Type Definitions

- **`packages/atlas-core/src/types.ts`**: Core types (Utterance, analysis options)
- **`apps/web/src/features/hooks/useStream.ts`**: Score and ImportantUtterance types

## Environment Variables

Required in `apps/web/.env.local`:

```bash
# OpenAI API (for embeddings)
OPENAI_API_KEY=sk-...

# Supabase (for session management and real-time sync)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Admin Users (comma-separated emails)
NEXT_PUBLIC_ADMIN_USERS=admin@example.com,admin2@example.com
```

**Note:** `SUPABASE_SERVICE_ROLE_KEY` is used for admin operations (bypasses RLS) and should be kept secret.

## Known Issues

1. **Empty string validation**: OpenAI embeddings API rejects empty strings - handled with validation
2. **Web Speech API restart**: Continuous mode sometimes stops - auto-restarts in `onend` handler
3. **Real-time sync delays**: Supabase real-time updates may have slight delays (~100-500ms)
4. **Low detection rate**: Short conversations (<10 utterances) may have few important detections due to statistical significance requirements

## Development Tips

### Testing Speech Recognition

- Use Chrome (best Web Speech API support)
- Speak clearly in Japanese
- Check console for recognition events
- Monitor API calls in Network tab

### Debugging Importance Detection

1. Open `/debug?session=<sessionId>` for real-time visualization
2. Check console for score calculation logs:
   - `[useStreamWithSupabase] スコア保存: ID=X, score=Y, p=Z`
3. Verify embedding dimensions (should be 1536 for text-embedding-3-small)
4. Check p-values in DebugConversationView (green if < fdrAlpha)
5. Inspect anchor count and score details

### Admin Session Management

1. Navigate to `/sessions` (requires admin role)
2. View all sessions with statistics
3. Click ▶ to expand and view conversation history
4. Use "リセット" to clear data while keeping session
5. Use "削除" to completely remove session
6. Export data as JSON or CSV

### Adjusting Detection Sensitivity

If too few/many important utterances are detected, adjust these parameters:

- **Increase `fdrAlpha`** (0.1 → 0.15): More lenient detection
- **Increase `k`** (15 → 20): Evaluate more candidates
- **Increase `halfLifeTurns`** (50 → 80): Even longer temporal memory
- **Decrease `halfLifeTurns`** (50 → 30): Prioritize more recent utterances
- **Note**: `nullSamples` auto-adjusts, manual override rarely needed

## Future Enhancements

1. **Dependency graph visualization**: Interactive node graph in debug view
2. **Multi-language support**: Extend beyond Japanese
3. **Speaker diarization**: Automatic speaker identification
4. **Context recovery**: Smart summaries for missed conversation parts
5. **User attention monitoring**: Detect when user is away
6. **Adaptive thresholding**: Adjust fdrAlpha based on conversation length
7. **Export conversation with highlights**: PDF/DOCX export with important utterances marked

## Contributing

When making changes:

1. Run `pnpm biome:fix` before committing
2. Use conventional commit messages (`chore:`, `feat:`, `fix:`)
3. Add Claude Code attribution in commit footer
4. Test in Chrome with real speech input
5. Verify no TypeScript errors with `pnpm dev`
