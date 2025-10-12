# ATLAS Web Application

Next.js 15 application for CTIDE (Context-aware Temporal Information Detection Engine).

## Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                 # API routes
│   ├── login/               # Login page
│   ├── ctide/               # CTIDE pages
│   │   ├── page.tsx         # Booth list
│   │   ├── booth/[id]/      # Conversation page
│   │   ├── sessions/        # Admin: Session management
│   │   └── debug/           # Admin: Debug viewer
│   └── middleware.ts        # Auth & admin middleware
├── features/                # Feature modules
│   └── ctide-assistant/     # CTIDE components & hooks
├── lib/                     # Libraries
│   └── supabase/            # Supabase clients & helpers
├── hooks/                   # React hooks
├── services/                # Business logic
└── types/                   # TypeScript types
```

## Environment Variables

Required in `.env.local`:

```bash
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_ADMIN_USERNAMES=admin,user2  # Optional
NEXT_PUBLIC_USERNAME_DOMAIN=test.com      # Optional (default: test.com)
```

## Development

```bash
# From monorepo root
pnpm dev

# Or from this directory
pnpm dev

# Open http://localhost:3000
```

## Database Migrations

Migrations are located in `supabase/migrations/`. Apply them to your Supabase project:

1. Create Supabase project
2. Disable email confirmation in Auth settings
3. Apply migrations manually or via Supabase CLI

## Key Routes

- `/login` - Username authentication
- `/ctide` - Booth list (protected)
- `/ctide/booth/[id]` - Conversation page (protected)
- `/ctide/sessions` - Admin: Session management (admin only)
- `/ctide/debug` - Admin: Debug viewer (admin only)

## Features

- Cookie-based SSR authentication via Supabase
- Row-level security (RLS) for multi-user conversations
- Real-time speech recognition with Web Speech API
- Temporal dependency detection with OpenAI embeddings
- Admin dashboard with data export (JSON/CSV)
