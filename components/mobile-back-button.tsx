"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function MobileBackButton() {
  const router = useRouter();

  return (
    <button type="button" className="grid place-items-center gap-1 rounded-2xl p-2 text-xs font-bold" onClick={() => router.back()}>
      <ArrowLeft size={20} /> Back
    </button>
  );
}
