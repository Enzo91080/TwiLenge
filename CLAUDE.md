# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Commands

```bash
pnpm install          # install all workspaces
pnpm dev              # start server (3001) + web (5173) + overlay (5174) concurrently
pnpm build            # build web + overlay (Vite) then server (tsc)
pnpm start            # run production server (NODE_ENV=production node dist/index.js)
```

Each app can also be run individually:
```bash
pnpm --filter server dev
pnpm --filter web dev
pnpm --filter overlay dev
```

## Architecture

**Monorepo (pnpm workspaces):** `server/`, `apps/web/`, `apps/overlay/`, `packages/shared/`

### Data flow
1. Streamer actions (web UI or Twitch chat) hit the **Fastify REST API** (`server/src/routes/`)
2. Routes mutate **MongoDB** (`server/src/db/index.ts`) and update **in-memory state** (`server/src/state.ts`)
3. WebSocket manager (`server/src/ws/manager.ts`) broadcasts `AppState` to all connected clients for that streamer
4. Web dashboard and OBS overlay both consume the WebSocket via `useWebSocket.ts` hook

### Multi-tenancy
Every document in MongoDB carries a `streamerId` (Twitch login). In-memory state is a `Map<streamerId, StreamerState>`. WebSocket clients are scoped per streamer — broadcasts never cross between streamers.

### Shared types
`packages/shared/src/index.ts` is the single source of truth for `Challenge`, `Session`, `SessionChallenge`, `AppState`, `WSEvent`, categories, difficulties, and statuses. Import from `@fortnite-challenge/shared`.

### Twitch integration
- **OAuth flow:** `/auth/twitch` → Twurple redirect → `/auth/callback` saves tokens in MongoDB `settings` collection. Tokens are **never returned** to the frontend.
- **Bot** (`twitch/bot.ts`): Twurple chat commands (`!defi`, `!ok`, `!fail`, `!skip`, `!vote`, etc.)
- **EventSub** (`twitch/eventsub.ts`): listens for channel point redeems to trigger random challenge

### Overlay
`apps/overlay` is a minimal React app (no React Query, no Router) used as an OBS Browser Source. It reads URL params: `?token=<ws_token>&streamer=<login>&position=top-right&theme=dark&scale=1`. Five style variants live in `apps/overlay/src/styles/`.

## Key Conventions

- **DB layer is async** — all `server/src/db/index.ts` functions return Promises (MongoDB driver).
- **Routes use Fastify hooks** — `requireAuth` middleware (`server/src/middleware/auth.ts`) protects authenticated routes.
- **Tailwind config** uses `require('tailwindcss-animate')` (not `await import`) — jiti does not support async imports.
- **UI button/badge variants** are defined with CVA in `apps/web/src/components/ui/`. Available button variants: `default` (yellow), `destructive`, `success`, `purple`, `blue`, `secondary`, `ghost`, `outline`.
- **No ORM** — raw MongoDB driver queries only.
- **No scores/points** — that system was removed; don't re-add `Challenge.points`, `Session.totalPoints`, or `SessionChallenge.pointsEarned`.

## Environment

```
MONGODB_URI=mongodb://localhost:27017/challenge-hub   # default if not set
PORT=3001
PUBLIC_URL=http://localhost:3001
# Twitch credentials (can also be configured via Settings UI, stored in DB)
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_CHANNEL=
```
