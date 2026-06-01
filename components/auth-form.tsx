"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToastPopup } from "@/components/ui/toast-popup";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        displayName: form.get("displayName"),
        password: form.get("password")
      })
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || "Something went wrong.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] bg-white/88 p-6 shadow-2xl shadow-rose-100 ring-1 ring-white">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ffcf5a]">
            <Gamepad2 />
          </span>
          <div>
            <h1 className="text-2xl font-black">{mode === "login" ? "Welcome back" : "Create player"}</h1>
            <p className="text-sm text-slate-500">Username + password, no OAuth needed.</p>
          </div>
        </div>
        <form onSubmit={submit} className="grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            Username
            <input name="username" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-rose-300" />
          </label>
          {mode === "register" && (
            <label className="grid gap-2 text-sm font-bold">
              Display name
              <input name="displayName" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-rose-300" />
            </label>
          )}
          <label className="grid gap-2 text-sm font-bold">
            Password
            <input name="password" type="password" required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-rose-300" />
          </label>
          <ToastPopup message={error} onDismiss={() => setError("")} />
          <Button disabled={loading}>{loading ? "Loading..." : mode === "login" ? "Login" : "Register"}</Button>
        </form>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-600">
          {mode === "login" ? (
            <>
              <Link href="/register">Need an account?</Link>
              <Link href="/forgot-password">Forgot password?</Link>
            </>
          ) : (
            <Link href="/login">Already have an account?</Link>
          )}
        </div>
      </section>
    </main>
  );
}
