import { AppShell } from "@/components/app-shell";
import { AdminPanel } from "@/components/admin-panel";
import { getCurrentUserWithProfile, requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  await requireAdmin();
  const user = await getCurrentUserWithProfile();

  return (
    <AppShell user={user}>
      <h1 className="mb-2 text-3xl font-black">Admin</h1>
      <p className="mb-5 text-slate-600">Search users and reset passwords without email tokens.</p>
      <AdminPanel />
    </AppShell>
  );
}
