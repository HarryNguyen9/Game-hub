# Game Hub MVP Design

The MVP is a mobile-first Next.js App Router application with a small custom auth system, Supabase Postgres/Storage, and a Socket.IO realtime room layer. Supabase Auth is intentionally not used. The browser only receives a signed httpOnly cookie and calls Next.js server routes; password, admin, profile write, room write, and avatar upload operations run server-side using the Supabase service role key.

Core units:
- Auth/session: username/password registration and login, bcrypt hashing, JWT cookie sessions, middleware route protection, logout, and password change.
- Profile: display name update and avatar upload to the public `avatars` Supabase Storage bucket.
- Admin: admin-only user search/listing and direct password reset for other users. A local seed script creates `admin/admin` with a hashed password when missing.
- Rooms: dashboard game placeholders, room create/join/leave/start APIs, durable membership in Postgres, and online membership/status updates through Socket.IO.
- UI: clean casual game hub styling, mobile bottom nav, desktop sidebar, reusable buttons/cards/avatar/member components.

RLS is enabled in the schema. Because custom auth does not produce Supabase Auth claims, direct client writes are blocked. The server is the trust boundary for sensitive mutations.
