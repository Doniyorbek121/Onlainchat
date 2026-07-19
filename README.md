# Character AI

A professional, open-source **Character.AI-style** platform: discover, create and
chat with lifelike AI characters — each with its own personality — powered by
[Claude](https://www.anthropic.com/claude).

Built as a complete, self-contained full-stack app inspired by projects like
[openroleplay](https://github.com/dineshxr/openroleplay) and
[ai-character-studio](https://github.com/SamurAIGPT/ai-character-studio).

## Features

- 🔐 **Real accounts** — email/username registration & login, secure `scrypt`
  password hashing, server-side sessions (30-day cookie), and one-click logout.
  Chats you start while signed out are migrated into your account on sign-up.
- 🔑 **Password reset** — request a link by email; single-use, SHA-256-hashed,
  1-hour tokens; changing the password invalidates all existing sessions.
  Links are emailed via SMTP when configured, otherwise logged (and returned in
  dev) so self-hosters can use the flow with zero setup.
- 🧭 **Discovery** — browse trending characters, filter by category, and search.
- 💬 **Real-time chat** — token-by-token streaming replies, persisted history,
  auto-resume of past conversations.
- 🎨 **Character creator & editor** — name, tagline, description, greeting, full
  personality/behaviour prompt, avatar (emoji + colour), category and visibility,
  with a live preview. Owners can edit or delete their characters (deleting a
  character cascades to its chats); ownership is enforced on every write.
- 🔒 **Private characters** — private characters are hidden from discovery and
  reachable only by their creator; enforced on every page and API route.
- 🗂️ **My characters & My chats** — manage everything you created; keep multiple
  separate conversations per character, start a fresh chat any time, and delete
  chats you no longer want.
- 🛡️ **Rate limiting** — login, registration, chat and character creation are
  throttled per client to resist brute-force and spam.
- ✅ **Tested & CI** — Vitest unit tests for the data layer and auth, plus a
  GitHub Actions workflow that runs tests and a production build on every push.
- 🧠 **Claude-powered** — each character becomes a role-played system prompt;
  streaming via Server-Sent Events.
- 💾 **Zero-config persistence** — embedded SQLite via `better-sqlite3`.
- 👤 **Frictionless sessions** — anonymous, cookie-based users; no sign-up needed.
- ⚡ **Demo mode** — runs fully without an API key (placeholder replies), so you
  can explore the UI immediately.

## Tech stack

| Layer     | Choice                                    |
| --------- | ----------------------------------------- |
| Framework | Next.js 15 (App Router) + React 19 + TS   |
| Styling   | Tailwind CSS (custom dark design system)  |
| AI        | `@anthropic-ai/sdk` (streaming Messages)  |
| Data      | Pluggable async store — SQLite (`better-sqlite3`) for local dev, **Postgres** (`pg`) for production, selected by `DATABASE_URL` |

## Getting started

```bash
pnpm install            # installs deps (compiles the SQLite native addon)
cp .env.example .env    # add your ANTHROPIC_API_KEY for real AI replies
pnpm dev                # http://localhost:3000
```

The database (`data/onlainchat.db`) and starter characters are created
automatically on first run. To seed manually: `pnpm seed`.

### Environment

| Variable            | Required | Description                                   |
| ------------------- | -------- | --------------------------------------------- |
| `ANTHROPIC_API_KEY` | For AI   | Enables live, in-character Claude responses.  |
| `CHARACTER_AI_MODEL`| No       | Model id (default `claude-opus-4-8`).         |
| `DATABASE_PATH`     | No       | SQLite file path (default `data/onlainchat.db`). |

Without an API key the app runs in **demo mode** — every feature works, but
characters reply with placeholder text.

## Database backends

The data layer is a single async interface (`src/lib/db/store.ts`) with two
interchangeable implementations, chosen at runtime:

- **No `DATABASE_URL`** → embedded **SQLite** file (`better-sqlite3`). Zero
  config; ideal for local development and demos.
- **`DATABASE_URL` set** → **Postgres** (`pg`). Recommended for any real
  deployment (persistent, concurrent, horizontally scalable, works on
  serverless/managed hosts). Schema is created automatically on first run.

Both backends are covered by the test suite; the Postgres suite runs whenever
`TEST_DATABASE_URL` is set (locally and in CI).

## Deployment

### Docker Compose (app + Postgres)

```bash
ANTHROPIC_API_KEY=sk-ant-... docker compose up --build
# → http://localhost:3000, backed by a Postgres container
```

### Docker (bring your own Postgres)

```bash
docker build -t character-ai .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgres://user:pass@host:5432/onlainchat" \
  -e DATABASE_SSL=true \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  character-ai
```

### Managed platforms (Vercel, Railway, Render, Fly, …)

Set `DATABASE_URL` (e.g. Supabase / Neon / RDS) and `ANTHROPIC_API_KEY` in the
platform's environment. On serverless, Postgres is required — the SQLite backend
needs a persistent local filesystem. Add `?sslmode=require` (or `DATABASE_SSL=true`)
if your provider enforces TLS.

## Project structure

```
src/
  app/
    page.tsx                  Discovery / home
    login/ register/          Auth screens
    forgot/ reset/            Password reset screens
    create/                   Character creator (requires sign-in)
    chat/[characterId]/       Chat screen
    character/[id]/           Character profile (+ owner edit/delete)
    character/[id]/edit/      Edit a character (owner only)
    mine/                     My characters (manage / private)
    library/                  My chats (multiple per character, deletable)
    api/
      auth/                   Register / login / logout / forgot / reset
      chat/                   Streaming chat (SSE)
      characters/             Create / list characters
      characters/[id]/        Get / update (PATCH) / delete a character
      conversations/[id]/     Delete a conversation
  components/                 Avatar, TopBar, UserMenu, AuthForm,
                              CharacterCard, Discovery, ChatRoom,
                              CharacterForm, CharacterOwnerActions
  lib/
    db.ts                     Backend selector + async data API
    db/store.ts               Shared async DataStore interface
    db/sqlite.ts              SQLite backend (better-sqlite3)
    db/postgres.ts            Postgres backend (pg)
    auth.ts                   Password hashing, sessions, password reset
    email.ts                  Password-reset delivery (SMTP / console)
    anthropic.ts              Claude integration + streaming
    rateLimit.ts              In-memory request throttling
    seed.ts                   Starter characters
    session.ts                Auth-aware / anonymous cookie sessions
    types.ts                  Shared types
tests/                        Vitest suites (db + auth)
.github/workflows/ci.yml      Test + build on every push
```

## How characters work

Each character stores a **persona** (personality & instructions). At chat time
that persona is compiled into a fenced system prompt that instructs Claude to
role-play the character while keeping the experience safe. Conversation history
is replayed on every turn to preserve context.
