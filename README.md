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
- 🧭 **Discovery** — browse trending characters, filter by category, and search.
- 💬 **Real-time chat** — token-by-token streaming replies, persisted history,
  auto-resume of past conversations.
- 🎨 **Character creator** — name, tagline, description, greeting, full
  personality/behaviour prompt, avatar (emoji + colour), category and visibility,
  with a live preview.
- 🗂️ **My chats** — every conversation you start is saved and resumable.
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
| Data      | SQLite (`better-sqlite3`)                  |

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

## Project structure

```
src/
  app/
    page.tsx                  Discovery / home
    login/  register/         Auth screens
    create/                   Character creator (requires sign-in)
    chat/[characterId]/       Chat screen
    character/[id]/           Character profile
    library/                  My chats
    api/
      auth/                   Register / login / logout
      chat/                   Streaming chat (SSE)
      characters/             Create / list / delete characters
      conversations/[id]/     Delete a conversation
  components/                 Avatar, TopBar, UserMenu, AuthForm,
                              CharacterCard, Discovery, ChatRoom,
                              CreateCharacterForm
  lib/
    db.ts                     SQLite data layer (users, sessions, characters…)
    auth.ts                   Password hashing + session auth
    anthropic.ts              Claude integration + streaming
    seed.ts                   Starter characters
    session.ts                Auth-aware / anonymous cookie sessions
    types.ts                  Shared types
```

## How characters work

Each character stores a **persona** (personality & instructions). At chat time
that persona is compiled into a fenced system prompt that instructs Claude to
role-play the character while keeping the experience safe. Conversation history
is replayed on every turn to preserve context.
