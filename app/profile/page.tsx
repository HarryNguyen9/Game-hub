import { AppShell } from "@/components/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { AvatarForm, PasswordForm, ProfileForm } from "@/components/profile-forms";
import { getCurrentUserWithProfile } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentUserWithProfile();

  return (
    <AppShell user={user}>
      <header className="mb-6 flex items-center gap-[clamp(12px,3vw,20px)]">
        <Avatar displayName={user.displayName} username={user.username} avatarUrl={user.avatarUrl} size="lg" />
        <div className="min-w-0">
          <h1 className="text-[clamp(1.5rem,6vw,1.875rem)] font-black leading-tight">Profile</h1>
          <p className="truncate font-semibold text-slate-500">@{user.username}</p>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ProfileForm displayName={user.displayName} />
        <AvatarForm />
        <PasswordForm />
      </div>
    </AppShell>
  );
}
