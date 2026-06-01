"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ToastPopup } from "@/components/ui/toast-popup";

type ToastTone = "error" | "success" | "info";

const inputClass = "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100";
const cardClass = "grid gap-3 rounded-[1.75rem] bg-white/86 p-[clamp(12px,4vw,20px)] shadow-sm";

export function ProfileForm({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<ToastTone>("success");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: form.get("displayName") })
    });
    setTone(response.ok ? "success" : "error");
    setMessage(response.ok ? "Profile updated." : (await response.json()).error);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={cardClass}>
      <h2 className="text-lg font-black">Display name</h2>
      <input name="displayName" defaultValue={displayName} className={inputClass} />
      <Button className="w-full justify-center">Save profile</Button>
      <ToastPopup message={message} tone={tone} onDismiss={() => setMessage("")} />
    </form>
  );
}

export function AvatarForm() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<ToastTone>("success");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/profile/avatar", { method: "POST", body: form });
    setTone(response.ok ? "success" : "error");
    setMessage(response.ok ? "Avatar updated." : (await response.json()).error);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={cardClass}>
      <h2 className="text-lg font-black">Avatar</h2>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-rose-200">
        <span className="shrink-0 rounded-xl bg-rose-50 px-3 py-1 text-xs font-black text-rose-500">
          Choose file
        </span>
        <span className="min-w-0 truncate text-sm text-slate-400">
          {fileName ?? "No file chosen"}
        </span>
        <input
          name="avatar"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      <Button className="w-full justify-center">Upload avatar</Button>
      <ToastPopup message={message} tone={tone} onDismiss={() => setMessage("")} />
    </form>
  );
}

export function PasswordForm() {
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<ToastTone>("success");

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
    setTone(response.ok ? "success" : "error");
    setMessage(response.ok ? "Password changed." : (await response.json()).error);
    if (response.ok) formElement.reset();
  }

  return (
    <form onSubmit={submit} className={cardClass}>
      <h2 className="text-lg font-black">Change password</h2>
      <input name="oldPassword" type="password" placeholder="Old password" className={inputClass} />
      <input name="newPassword" type="password" placeholder="New password" className={inputClass} />
      <input name="confirmPassword" type="password" placeholder="Confirm new password" className={inputClass} />
      <Button className="w-full justify-center">Change password</Button>
      <ToastPopup message={message} tone={tone} onDismiss={() => setMessage("")} />
    </form>
  );
}
