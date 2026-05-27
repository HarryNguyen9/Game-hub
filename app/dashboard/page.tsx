import { unstable_noStore as noStore } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { DashboardHub } from "@/components/dashboard-hub";
import { getActiveRoomForUser } from "@/lib/active-room";
import { getCurrentUserWithProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  noStore();
  const user = await getCurrentUserWithProfile();
  const activeRoom = await getActiveRoomForUser(user.id);

  return (
    <AppShell user={user}>
      <DashboardHub activeRoomId={activeRoom?.id ?? null} />
    </AppShell>
  );
}
