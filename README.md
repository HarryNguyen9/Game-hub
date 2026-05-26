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
- `fleet:sync`
- `fleet:place_ships`
- `fleet:confirm_ready`
- `fleet:fire`
- `fleet:snapshot`
- `fleet:setup_updated`
- `fleet:battle_started`
- `fleet:shot_result`
- `fleet:turn_changed`
- `fleet:end`
- `oaq:sync`
- `oaq:move`
- `oaq:snapshot`
- `oaq:move_result`
- `oaq:turn_timeout`
- `oaq:end`
- `chess:sync`
- `chess:move`
- `chess:resign`
- `chess:snapshot`
- `chess:move_result`
- `chess:turn_changed`
- `chess:turn_timeout`
- `chess:end`

The Socket.IO server runs as a separate long-running Node process in `server/index.ts`. The web app gets a short-lived socket token from `/api/socket-token`; the socket server verifies that token with `SESSION_SECRET`.

## Game Registry And Room Limits

Game metadata lives in `lib/constants.ts`. Each game declares `minPlayers` and `maxPlayers`; the room stores those values when the host chooses a game. Server routes and Socket.IO start/join handlers validate the stored limits, so clients cannot force a larger room size.

- `Flappy Rush`: 1-4 active players.
- `Fleet Duel`: exactly 2 active players.
- `Chess`: exactly 2 active players.
- `Ô Ăn Quan`: exactly 2 active players.

Turn-based games use a server-owned 30 second turn timer. The client only renders the countdown from server timestamps; if a player does not move in time, the socket server skips their turn and broadcasts the next snapshot. This applies to `Fleet Duel`, `Ô Ăn Quan`, and future turn-based games.

For timeout behavior, `Fleet Duel` and `Ô Ăn Quan` skip the player on timeout. `Chess` ends immediately and the timed-out player loses. Turn-based clients also show a short `Your turn` popup when the server switches the turn to the current user.

## Testing Flappy Rush Locally

Run the web app and socket server:

```bash
npm run dev
```

Open two or three browser sessions with different accounts:

1. Account A creates a room, chooses `Flappy Rush`, and shares the 4-digit room code.
2. Account B joins by code, clicks Ready, then A clicks Start Game.
3. Both players should see a `3..2..1` countdown and a canvas game.
4. Tap on mobile, click the canvas, or press Space on desktop to flap. Space does not scroll the page during play. The client only sends `game:input` with `input: "flap"`; physics, pipes, score, death, and game end are calculated on the Socket.IO server.
5. Open Account C after the game starts. C should enter `waiting_next_round` and see the waiting message instead of controlling the current game.
6. When all active birds crash, the leaderboard appears. The host can click Back to Lobby, which moves all members back to the lobby and resets player ready state.

The Flappy Rush client renders canvas frames with `requestAnimationFrame` and interpolates between server snapshots for smoother motion. A tiny local visual-only flap prediction makes your own pig feel responsive, but official position, score, death, pipes, and winner always come from the server snapshot.

## Realtime Stability Checklist

Use two or three browser sessions with different accounts:

- Refresh during lobby: user reconnects to the same room and sees current members/ready state.
- Refresh during playing: active players receive the current Flappy Rush snapshot again.
- Player disconnect while playing: the game loop continues and reconnect restores spectating/playing state.
- Host refresh while playing: room does not close during a quick reconnect.
- Host leave while playing: room closes, members are redirected, and the Flappy loop is cleaned up.
- Late join while playing: user enters `waiting_next_round` and cannot control the active game.
- Spam Ready/Unready: only the current player's ready state changes and the server does not crash.
- Spam Start Game: only one game session/runtime starts for a room.
- Spam Back to Lobby: action is idempotent and returns everyone to lobby once.
- Invalid input after death: server ignores/rejects input; client never sends y, velocity, or score.
- Token refresh/reconnect: reload the room after login and verify a new socket token connects.

## Flappy Rush Gameplay QA

- Mobile browser: tap feels immediate, page does not scroll/select text while tapping the canvas.
- Desktop browser: Space and click flap once per press/click; holding Space does not spam key-repeat inputs.
- Two players: your own bird is vivid, other birds render as visible ghost birds with name labels.
- Spectating after death: “You crashed!” appears without hiding the whole game.
- Leaderboard: winner is highlighted, non-host sees waiting-for-host text, host can Back to Lobby.
- Fullscreen: game keeps aspect ratio, does not stretch birds/pipes, and controls remain reachable.

## Fleet Duel Gameplay QA

- Account A creates a room, chooses `Fleet Duel`, and sees `1/2` players.
- A cannot start until Account B joins and readies.
- Account C cannot join the waiting lobby once Fleet Duel is `2/2`; the API returns `Room is full.`
- A starts the game and both players enter setup.
- Use Random Placement or manually place all ships, then Confirm Fleet on both accounts.
- During battle, only the player whose turn is shown can fire.
- Enemy ship cells are hidden until hit or sunk; clients only receive their own ships plus public shot results.
- Hit/miss/sunk updates appear realtime.
- A late joiner during battle enters `waiting_next_round` and cannot send Fleet input.
- When one fleet is sunk, the winner card appears and the host can Back to Lobby.

## Ô Ăn Quan Gameplay QA

This is a simplified online ruleset for the Vietnamese traditional game:

- Board has 12 pits: 2 quan pits and 10 dân pits.
- Each dân pit starts with 5 small stones.
- Each quan pit starts with 1 big stone worth 10 points.
- Players choose one of their five dân pits, then choose clockwise or counterclockwise.
- The server applies sowing, capture, score, turn changes, timeout, and game end.
- No client-side official score, capture, or winner calculation is trusted.
- Advanced borrowing/vay dân rules are intentionally not included in this MVP.

Manual test:

1. Account A creates a room, chooses `Ô Ăn Quan`, and sees `1/2` players.
2. Account B joins and readies, then A starts.
3. Both players see the same board and a 30 second countdown.
4. The current player selects a highlighted dân pit, chooses a direction, and the board updates realtime.
5. The non-current player cannot move.
6. Let one turn expire; the server emits a timeout and switches turn.
7. Finish or force an end state, then verify final score/winner and Back to Lobby.

## Chess Gameplay QA

- Account A creates a room, chooses `Chess`, and sees `1/2` players.
- Account B joins and readies, then A starts.
- The server randomly assigns White/Black; White moves first.
- The player whose turn it is sees the countdown and `Your turn` popup.
- Tap a piece, then tap its destination. The client sends only `from`, `to`, and optional promotion; `chess.js` on the socket server validates the move.
- Invalid moves are rejected without changing the board.
- Valid moves update the FEN, move history, check/draw/checkmate state, and reset the 30 second timer.
- Promotion defaults to Queen in this MVP.
- If a player times out, they lose by timeout and the game ends.
- The host can Back to Lobby after checkmate, draw, resignation, or timeout.
