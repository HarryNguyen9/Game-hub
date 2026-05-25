"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ProfileForm({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: form.get("displayName") })
    });
    setMessage(response.ok ? "Profile updated." : (await response.json()).error);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[1.75rem] bg-white/86 p-5 shadow-sm">
      <h2 className="text-lg font-black">Display name</h2>
      <input name="displayName" defaultValue={displayName} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-300" />
      <Button>Save profile</Button>
      {message && <p className="text-sm font-bold text-slate-500">{message}</p>}
    </form>
  );
}

export function AvatarForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
    setMessage(response.ok ? "Avatar updated." : (await response.json()).error);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[1.75rem] bg-white/86 p-5 shadow-sm">
      <h2 className="text-lg font-black">Avatar</h2>
      <input name="avatar" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
      <Button>Upload avatar</Button>
      {message && <p className="text-sm font-bold text-slate-500">{message}</p>}
    </form>
  );
}

export function PasswordForm() {
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/profile/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldPassword: form.get("oldPassword"),
        newPassword: form.get("newPassword"),
        confirmPassword: form.get("confirmPassword")
      })
    });
    setMessage(response.ok ? "Password changed." : (await response.json()).error);
    if (response.ok) formElement.reset();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[1.75rem] bg-white/86 p-5 shadow-sm">
      <h2 className="text-lg font-black">Change password</h2>
      <input name="oldPassword" type="password" placeholder="Old password" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-300" />
      <input name="newPassword" type="password" placeholder="New password" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-300" />
      <input name="confirmPassword" type="password" placeholder="Confirm new password" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-300" />
      <Button>Change password</Button>
      {message && <p className="text-sm font-bold text-slate-500">{message}</p>}
    </form>
  );
}
