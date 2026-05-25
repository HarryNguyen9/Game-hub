import { AppShell } from "@/components/app-shell";
import { CreateRoomForm } from "@/components/room-forms";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function CreateRoomPage() {
  const user = await getCurrentUserWithProfile();

  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-3xl font-black">Create room</h1>
        <p className="mb-5 text-slate-600">Create the lobby first. The host can choose the game inside the room.</p>
        <CreateRoomForm />
      </div>
    </AppShell>
  );
}
