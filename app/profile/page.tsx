import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { AvatarForm, PasswordForm, ProfileForm } from "@/components/profile-forms";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUserWithProfile();

  return (
    <AppShell user={user}>
      <header className="mb-6 flex items-center gap-4">
        <Avatar displayName={user.displayName} username={user.username} avatarUrl={user.avatarUrl} size="lg" />
        <div>
          <h1 className="text-3xl font-black">Profile</h1>
          <p className="font-semibold text-slate-500">@{user.username}</p>
        </div>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <ProfileForm displayName={user.displayName} />
        <AvatarForm />
        <PasswordForm />
      </div>
    </AppShell>
  );
}
