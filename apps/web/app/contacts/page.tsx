import { redirect } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { InviteGenerator } from "@/features/contacts/presentation/InviteGenerator";
import { InviteRedeemer } from "@/features/contacts/presentation/InviteRedeemer";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex flex-1 max-w-sm flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">連絡先を追加</h1>
        <p className="mt-1 text-sm text-neutral-400">
          電話番号を使わずに、招待コードでつながることができます。
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-300">
          自分の招待コードを発行する
        </h2>
        <InviteGenerator userId={user!.id} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-300">
          相手の招待コードを入力する
        </h2>
        <InviteRedeemer />
      </section>
    </main>
  );
}
