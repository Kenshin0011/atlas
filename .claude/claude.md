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
│       │   ├── components/ # React components
│       │   ├── services/ # Business logic (dependency analyzer, embeddings)
│       │   ├── types/    # TypeScript type definitions
│       │   └── utils/    # Utility functions
│       └── package.json
└── packages/
    └── atlas-core/       # Shared core library
        ├── src/
        │   ├── format/   # Time formatting utilities
        │   ├── math/     # Mathematical functions (similarity)
        │   ├── temporal/ # Temporal decay functions
        │   ├── text/     # Japanese text processing
        │   └── types.ts  # Core type definitions
        └── package.json
```

### Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Speech Recognition**: Web Speech API (browser-native, free)
- **AI/ML**: OpenAI text-embedding-3-small for semantic similarity
- **Build Tools**: Turbo (monorepo), pnpm (package manager)
- **Code Quality**: Biome (linter/formatter)
- **Deployment**: Vercel (serverless)

## Core Concepts

### Multi-Scale Temporal Dependencies

ATLAS detects three types of dependencies:

1. **Local Dependencies** (λ=0.5): Direct references to recent utterances (1-3 back)
   - Uses OpenAI embeddings + cosine similarity
   - Threshold: weight > 0.3

2. **Topical Dependencies** (λ=0.2): References within the same topic
   - Simple noun overlap heuristic (カタカナ/漢字)
   - Looks at last 10 utterances
   - Threshold: weight > 0.25

3. **Global Dependencies** (λ=0.05): Long-term foreshadowing
   - Not yet fully implemented
   - For future enhancement

### Temporal Decay Function

```typescript
ω(distance, type) = β_type × exp(-λ_type × distance)
```

Where:
- `distance`: Number of utterances between current and referenced
- `β`: Base weight (local: 1.0, topic: 0.8, global: 0.9)
- `λ`: Decay rate (configurable per type)

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

### POST /api/detect-dependency

Analyzes a new utterance and detects dependencies with previous utterances.

**Request Body:**
```typescript
{
  dialogue: Utterance[];  // Conversation history
  current: Utterance;     // New utterance to analyze
}
```

**Response:**
```typescript
{
  is_scain: boolean;
  dependencies: Dependency[];
  scain_type?: 'short-term' | 'mid-term' | 'long-term';
  importance_score: number;
  max_dependency_weight: number;
}
```

## Key Files

### Core Logic

- **`apps/web/src/services/dependencyAnalyzer.ts`**: Main dependency detection logic
- **`apps/web/src/services/embeddingService.ts`**: OpenAI embeddings wrapper
- **`packages/atlas-core/src/math/similarity.ts`**: Cosine similarity calculation
- **`packages/atlas-core/src/temporal/decay.ts`**: Temporal decay function

### UI Components

- **`apps/web/src/components/ConversationAssistant.tsx`**: Main orchestration component
- **`apps/web/src/components/ControlPanel.tsx`**: Start/Stop/Clear controls
- **`apps/web/src/components/ConversationView.tsx`**: Conversation history display
- **`apps/web/src/components/NotificationPanel.tsx`**: Smart notifications

### Type Definitions

- **`packages/atlas-core/src/types.ts`**: Core types (Utterance, Dependency, SCAINResult)
- **`apps/web/src/types/speech.ts`**: Web Speech API type definitions

## Environment Variables

Required in `apps/web/.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

## Known Issues

1. **Empty string validation**: OpenAI embeddings API rejects empty strings - handled with validation
2. **Web Speech API restart**: Continuous mode sometimes stops - auto-restarts in `onend` handler
3. **Embedding index alignment**: After filtering empty strings, ensure array indices match

## Development Tips

### Adding New Dependency Types

1. Create new computation function in `dependencyAnalyzer.ts`
2. Add to `detectDependencies()` function
3. Update `SCAINResult` type if needed
4. Add new decay parameter to `DEFAULT_CONFIG`

### Testing Speech Recognition

- Use Chrome (best Web Speech API support)
- Speak clearly in Japanese
- Check console for recognition events
- Monitor API calls in Network tab

### Debugging Dependency Detection

- Add console.logs in `computeLocalDependencies()`
- Check embedding dimensions (should be 1536 for text-embedding-3-small)
- Verify cosine similarity values (should be between -1 and 1)
- Inspect temporal decay weights

## Future Enhancements

1. **Custom hooks**: Extract speech recognition logic into `useSpeechRecognition.ts`
2. **Global dependencies**: Implement foreshadowing detection
3. **Speaker diarization**: Automatic speaker identification
4. **Context recovery**: Smart summaries for missed conversation parts
5. **User attention monitoring**: Detect when user is away

## Contributing

When making changes:

1. Run `pnpm biome:fix` before committing
2. Use conventional commit messages (`chore:`, `feat:`, `fix:`)
3. Add Claude Code attribution in commit footer
4. Test in Chrome with real speech input
5. Verify no TypeScript errors with `pnpm dev`
