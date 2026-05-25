import Link from "next/link";
import { clsx } from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[#ff7a90] text-white shadow-lg shadow-rose-200 hover:bg-[#f45f7a]",
        variant === "secondary" && "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50",
        variant === "ghost" && "bg-transparent text-slate-700 hover:bg-white/70",
        variant === "danger" && "bg-red-500 text-white hover:bg-red-600",
        className
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  className,
  variant = "primary",
  children
}: {
  href: string;
  className?: string;
  variant?: ButtonProps["variant"];
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition active:scale-[0.98]",
        variant === "primary" && "bg-[#ff7a90] text-white shadow-lg shadow-rose-200 hover:bg-[#f45f7a]",
        variant === "secondary" && "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50",
        variant === "ghost" && "bg-transparent text-slate-700 hover:bg-white/70",
        variant === "danger" && "bg-red-500 text-white hover:bg-red-600",
        className
      )}
    >
      {children}
    </Link>
  );
}
