# Game Hub MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Next.js game hub MVP with custom username/password auth, profile/avatar management, admin password reset, Supabase schema, and Socket.IO rooms.

**Architecture:** Next.js App Router renders protected pages and exposes API routes for all sensitive writes. Supabase service-role access stays server-only. Socket.IO runs from a custom `server.ts` and uses the same signed session cookie.

**Tech Stack:** Next.js, TypeScript, TailwindCSS, Supabase, bcryptjs, jose, Socket.IO, Zod, Vitest.

---

- [x] Scaffold project config, env example, Tailwind, ESLint, Vitest.
- [x] Add validation/session unit tests and core helpers.
- [ ] Add API routes for auth, profile, admin, and rooms.
- [ ] Add custom Socket.IO server.
- [ ] Add app shell and responsive pages.
- [ ] Add SQL schema, seed script, and README.
- [ ] Run tests, lint, and build.
