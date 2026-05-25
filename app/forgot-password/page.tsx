import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="max-w-md rounded-[2rem] bg-white/90 p-6 text-center shadow-xl">
        <h1 className="text-2xl font-black">Password reset</h1>
        <p className="mt-3 text-slate-600">
          This MVP does not use email reset links. Ask an admin to reset your password from the admin panel.
        </p>
        <Link className="mt-6 inline-flex rounded-2xl bg-[#ff7a90] px-5 py-3 font-bold text-white" href="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}
