# Game Hub MVP

A responsive Next.js App Router game hub base with custom username/password auth, Supabase database/storage, admin password reset, and Socket.IO realtime rooms.

## Stack

- Next.js App Router + TypeScript
- TailwindCSS
- Supabase Postgres + Storage
- Custom auth with username/password
- bcrypt password hashing
- httpOnly signed JWT session cookie
- Socket.IO room events

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env:

```bash
cp .env.example .env
```

Set:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=use-a-long-random-string
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
APP_ORIGIN=http://localhost:3000
SOCKET_PORT=4000
```

3. In Supabase SQL editor, run:

```bash
supabase/schema.sql
```

`schema.sql` also migrates older MVP data from `profiles` into `app_users`, drops the old `profiles` table, and applies the service-role grants. Do not grant `anon` or `authenticated` access to `app_users`; it contains `password_hash`. `avatar_url` is allowed to stay `NULL`; the UI shows a default initial avatar until the user uploads one.

If you already ran an older schema, run the consolidated room lifecycle migration once:

```bash
supabase/migrations/20260525_room_lifecycle.sql
```

This migration also adds the 4-digit `rooms.room_code` used by the Join by code page. New rooms get a random code from the server; existing open rooms without a code are backfilled.

Room cleanup uses database cascades: when the host leaves, the app deletes the `rooms` row, and Postgres automatically removes related `room_members` and `game_sessions`.

4. Create the avatar bucket:

The schema attempts to create a public `avatars` bucket. If your project blocks that SQL path, create a public bucket named `avatars` in Supabase Storage.

5. Seed the MVP admin account:

```bash
npm run seed:admin
```

This creates or updates:

- username: `admin`
- password: `admin`

The password is still stored as a bcrypt hash. Change it for anything beyond local MVP testing.

6. Run locally:

```bash
npm run dev
```

This starts Next.js on `http://localhost:3000` and the Socket.IO server on `http://localhost:4000`.

You can also run them in separate terminals:

```bash
npm run dev:web
npm run socket:dev
```

Open `http://localhost:3000`.

To test the production-style split setup locally:

```bash
npm run build
npm start
```

In a second terminal:

```bash
npm run socket:start
```

Then open `http://localhost:3000`. For this mode, set `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000`.

## Deploy To Vercel And Render

Production uses two services:

- Vercel: Next.js web app
- Render: Socket.IO/game server
- Supabase: database and storage

### 1. Push GitHub

Push this repository to GitHub so both Vercel and Render can deploy from the same source.

### 2. Deploy Web To Vercel

- Framework: Next.js
- Build Command: `npm run build`
- Output: Vercel default

Set Vercel env vars:

```env
NEXT_PUBLIC_APP_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
NEXT_PUBLIC_SOCKET_URL=https://YOUR_RENDER_SOCKET_DOMAIN.onrender.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
```

### 3. Deploy Socket To Render

- New Web Service
- Same GitHub repo
- Build Command: `npm install`
- Start Command: `npm run socket:start`

Set Render env vars:

```env
APP_ORIGIN=https://YOUR_VERCEL_DOMAIN.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
NODE_ENV=production
```

Render provides `PORT` automatically. `server/index.ts` also supports `SOCKET_PORT` for local or custom hosting.

### 4. Wire The URLs

After Render creates the socket URL, update Vercel:

```env
NEXT_PUBLIC_SOCKET_URL=https://YOUR_RENDER_SOCKET_DOMAIN.onrender.com
```

Then redeploy Vercel, because `NEXT_PUBLIC_*` values are embedded at build time.

After Vercel creates the web URL, update Render:

```env
APP_ORIGIN=https://YOUR_VERCEL_DOMAIN.vercel.app
```

Then redeploy Render so Socket.IO CORS accepts the Vercel origin.

## Routes

- `/login`
- `/register`
- `/forgot-password`
- `/dashboard`
- `/profile`
- `/rooms/create`
- `/rooms/join`
- `/rooms/[roomId]`
- `/admin`

## Auth And RLS Notes

This app does not use Supabase Auth. Next.js owns authentication through a signed httpOnly cookie. Sensitive writes and reads run in API routes with `SUPABASE_SERVICE_ROLE_KEY`.

RLS is enabled in `supabase/schema.sql`. Direct browser writes to sensitive tables are blocked because a custom cookie does not automatically become Supabase Auth claims. Keep password, admin, profile write, and room mutation logic server-side.

## Socket.IO Events

- `room:join`
- `room:leave`
- `room:select_game`
- `room:toggle_ready`
- `room:start_game`
- `room:back_to_lobby`
- `room:joined`
- `room:members_updated`
- `room:status_updated`
- `room:error`
- `room:closed`
- `room:open_rooms_updated`
- `game:start`
- `game:snapshot`
- `game:player_dead`
- `game:end`

The Socket.IO server runs as a separate long-running Node process in `server/index.ts`. The web app gets a short-lived socket token from `/api/socket-token`; the socket server verifies that token with `SESSION_SECRET`.

## Testing Flappy Duel Locally

Run the web app and socket server:

```bash
npm run dev
```

Open two or three browser sessions with different accounts:

1. Account A creates a room, chooses `Flappy Duel`, and shares the 4-digit room code.
2. Account B joins by code, clicks Ready, then A clicks Start Game.
3. Both players should see a `3..2..1` countdown and a canvas game.
4. Tap, click, or press Space to flap. The client only sends `game:input` with `input: "flap"`; physics, pipes, score, death, and game end are calculated on the Socket.IO server.
5. Open Account C after the game starts. C should enter `waiting_next_round` and see the waiting message instead of controlling the current game.
6. When all active birds crash, the leaderboard appears. The host can click Back to Lobby, which moves all members back to the lobby and resets player ready state.
