"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

type AdminUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
};

export function AdminPanel() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/admin/users?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((payload) => setUsers(payload.users || []))
        .catch(() => setUsers([]));
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  async function resetPassword(userId: string) {
    const newPassword = window.prompt("New password for this user");
    if (!newPassword) return;
    const response = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newPassword })
    });
    setMessage(response.ok ? "Password reset." : (await response.json()).error);
  }

  return (
    <section className="rounded-[2rem] bg-white/88 p-5 shadow-sm">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search username or display name"
        className="mb-4 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-300"
      />
      {message && <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</p>}
      <div className="grid gap-3">
        {users.map((user) => {
          return (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-50 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar displayName={user.display_name || user.username} username={user.username} avatarUrl={user.avatar_url || null} />
                <div className="min-w-0">
                  <p className="truncate font-black">{user.display_name || user.username}</p>
                  <p className="truncate text-sm font-bold text-slate-500">
                    @{user.username} · {user.role}
                  </p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => resetPassword(user.id)}>
                Reset password
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
