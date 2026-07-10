import { redirect } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { ProfileForm } from "@/features/profile/presentation/ProfileForm";
import { EnableNotificationsButton } from "@/features/notification/presentation/EnableNotificationsButton";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex flex-1 max-w-sm flex-col justify-center gap-8 px-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">プロフィール</h1>
      </div>
      <ProfileForm userId={user!.id} />

      <div className="border-t border-neutral-800 pt-6">
        <h2 className="mb-3 text-sm font-medium text-neutral-300">通知設定</h2>
        <EnableNotificationsButton userId={user!.id} />
      </div>
    </main>
  );
}
