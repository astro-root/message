import { redirect } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { ConversationList } from "@/features/messaging/presentation/ConversationList";

export default async function ConversationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex flex-1 max-w-sm flex-col px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-neutral-100">会話</h1>
      <ConversationList currentUserId={user.id} />
    </main>
  );
}
