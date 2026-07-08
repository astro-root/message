import { redirect } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { ProfileForm } from "@/features/profile/presentation/ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">プロフィール</h1>
      </div>
      <ProfileForm userId={user!.id} />
    </main>
  );
}
