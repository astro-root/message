import { redirect } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server";
import { ChatWindow } from "@/features/messaging/presentation/ChatWindow";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ otherUserId?: string }>;
};

export default async function ConversationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { otherUserId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!otherUserId) {
    redirect("/conversations");
  }

  return (
    <ChatWindow
      conversationId={id}
      currentUserId={user!.id}
      otherUserId={otherUserId}
    />
  );
}
