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
- 🌐 **22 interface languages** — English, Uzbek, Russian, Spanish, French,
  German, Portuguese, Italian, Turkish, Polish, Ukrainian, Dutch, Indonesian,
  Vietnamese, Hindi, Bengali, Chinese, Japanese, Korean, Thai, Arabic and
  Persian — with a language switcher, right-to-left layout for Arabic/Persian,
  and English fallback. (The AI itself replies in whatever language you write in,
  so conversations aren't limited to this list.)
- 🧭 **Discovery** — browse trending characters, filter by category, and search.
- 💬 **Real-time chat** — token-by-token streaming replies, persisted history,
  auto-resume of past conversations. **Stop** a reply mid-stream (the partial
  text is kept and saved) or **regenerate** the last reply for a fresh take.
- 🎨 **Character creator & editor** — name, tagline, description, greeting, full
  personality/behaviour prompt, avatar (upload a **photo**, or pick an emoji +
  colour), category and visibility, with a live preview. Uploaded photos are
  cropped and compressed client-side to a small square and stored inline, so no
  external file storage is needed. Owners can edit or delete their characters
  (deleting a character cascades to its chats); ownership is enforced on every write.
- ❤️ **Save & share** — like/save characters (with live counts shown on cards and
  profiles) and copy a shareable link (native share sheet where available).
- 👤 **Profiles** — public profile pages at `/u/<username>` listing a creator's
  public characters and chat totals; your own profile also shows your saved
  characters. Creator names link through to their profile.
- 🔒 **Private characters** — private characters are hidden from discovery and
  reachable only by their creator; enforced on every page and API route.
- 🗂️ **My characters & My chats** — manage everything you created; keep multiple
  separate conversations per character, start a fresh chat any time, and delete
  chats you no longer want.
- 🛡️ **Trust & safety** — a baseline content-safety filter (blocks the
  sexualisation of minors, extensible via `MODERATION_BLOCKLIST`) screens every
  character before it's stored, a **report/flag** control is available across the
  app, and a first-visit **age gate + consent** confirms users are 18+ and accept
  the Terms.
- 🛡️ **Admin panel** — a role-gated `/admin` dashboard (bootstrapped via
  `ADMIN_EMAILS` or a user's `role`) with live totals (users, characters,
  conversations, messages), a **moderation queue** for reports (resolve / dismiss
  / delete the reported content), and delete-any-character / delete-user tools.
- ⚖️ **Legal & GDPR** — Terms of Service and Privacy Policy pages, and
  self-service **data export** (JSON) and **account deletion** (cascades all
  your data) from account settings.
- ✉️ **Email verification** — a verification link is emailed on sign-up
  (single-use, 24-hour, hashed token); optionally require it before character
  creation via `REQUIRE_EMAIL_VERIFICATION`.
- 🔏 **Hashed sessions** — only a SHA-256 of each session token is stored, so a
  database leak can't be replayed as a live login. Password-reset tokens are
  hashed and single-use the same way.
- 🪖 **Security headers** — a strict **Content-Security-Policy** (tightened
  automatically per configured integration), HSTS, `X-Frame-Options: DENY`,
  `nosniff`, a locked-down `Permissions-Policy`, and no `X-Powered-By`.
- 🩺 **Health probe** — `GET /api/health` checks database connectivity for load
  balancers / Kubernetes readiness & liveness, and bounded chat context (last 40
  messages sent to the model) keeps prompt cost flat as histories grow.
- 📈 **Production-ready ops** — optional **Redis** rate limiting (shared across
  replicas), **Sentry** error tracking + structured JSON logs, **S3/R2** avatar
  storage, cursor-style **pagination** on discovery, and cookieless **Plausible**
  analytics — all off by default and enabled purely through env vars.
- ♿ **Accessibility** — skip-to-content link, visible keyboard focus, ARIA on
  menus/dialogs/tabs, labelled controls, and reduced-motion support.
- 🛡️ **Rate limiting** — login, registration, chat and character creation are
  throttled per client to resist brute-force and spam.
- 🧷 **CSRF protection** — a double-submit token (`x-csrf-token` header vs.
  `oc_csrf` cookie) plus a same-origin check guard every state-changing API
  request, enforced centrally in middleware.
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
| `DATABASE_URL`      | Prod     | Postgres connection string; unset uses SQLite. |
| `DATABASE_PATH`     | No       | SQLite file path (default `data/onlainchat.db`). |
| `ADMIN_EMAILS`      | No       | Comma-separated emails granted `/admin` access. |
| `SMTP_URL`          | No       | SMTP server for password-reset emails.        |

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
    u/[username]/             Public user profile (created + saved)
    mine/                     My characters (manage / private)
    library/                  My chats (multiple per character, deletable)
    admin/                    Admin dashboard (role-gated)
    api/
      auth/                   Register / login / logout / forgot / reset
      chat/                   Streaming chat (SSE)
      characters/             Create / list characters
      characters/[id]/        Get / update (PATCH) / delete a character
      conversations/[id]/     Delete a conversation
      admin/                  Admin moderation (delete user / character)
      health/                 DB health probe for load balancers
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
    rateLimit.ts / http.ts    Throttling / CSRF-aware fetch wrapper
    validate.ts               Shared input validation (avatar images)
    i18n/                     22-language UI translations + locale helpers
    types.ts                  Shared types
  middleware.ts               CSRF (double-submit + same-origin) enforcement
tests/                        Vitest suites (db + auth)
.github/workflows/ci.yml      Test + build on every push
```

## How characters work

Each character stores a **persona** (personality & instructions). At chat time
that persona is compiled into a fenced system prompt that instructs Claude to
role-play the character while keeping the experience safe. Conversation history
is replayed on every turn to preserve context (bounded to the most recent turns
so token cost stays flat).

## Scaling & operations

The app is **stateless** (bar the in-memory rate limiter) so it scales
horizontally behind a load balancer. See [`SCALING.md`](./SCALING.md) for an
honest map of what the code already does for load and safety, and the
infrastructure to add for very large traffic (shared/Redis rate limiting,
PgBouncer + read replicas, CDN, object storage for avatars, denormalised
counters, background jobs & observability, and running migrations as a separate
deploy step).
