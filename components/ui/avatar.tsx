import Image from "next/image";
import { clsx } from "clsx";
import { initialAvatarLabel } from "@/lib/rooms";

export function Avatar({
  displayName,
  username,
  avatarUrl,
  size = "md"
}: {
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-20 w-20" : "h-12 w-12";
  return (
    <div
      className={clsx(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-amber-200 via-pink-200 to-sky-200 font-black text-slate-700 ring-4 ring-white",
        sizeClass
      )}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={displayName} fill sizes="80px" className="object-cover" />
      ) : (
        <span>{initialAvatarLabel(displayName, username)}</span>
      )}
    </div>
  );
}
