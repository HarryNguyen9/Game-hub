import { AppShell } from "@/components/app-shell";
import { JoinRoomForm } from "@/components/room-forms";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function JoinRoomPage() {
  const user = await getCurrentUserWithProfile();

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-3xl font-black">Join room</h1>
        <p className="mb-5 text-slate-600">Enter the 4-digit room code shared by the host.</p>
        <JoinRoomForm />
      </div>
    </AppShell>
  );
}
