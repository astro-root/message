import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";
import type { MessageReceipt } from "@/features/messaging/domain/receipt";

export async function markMessagesAsRead(
  messageIds: string[],
  userId: string,
): Promise<void> {
  if (messageIds.length === 0) return;

  const supabase = createBrowserSupabaseClient();

  const rows = messageIds.map((messageId) => ({
    message_id: messageId,
    user_id: userId,
    status: "read" as const,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("message_receipts")
    .upsert(rows, { onConflict: "message_id,user_id" });

  if (error) {
    throw new Error(`既読の記録に失敗しました: ${error.message}`);
  }
}

export async function fetchReceiptsForConversation(
  conversationId: string,
): Promise<MessageReceipt[]> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("message_receipts")
    .select("message_id, user_id, status, updated_at, messages!inner(conversation_id)")
    .eq("messages.conversation_id", conversationId);

  if (error) {
    throw new Error(`既読状況の取得に失敗しました: ${error.message}`);
  }

  type ReceiptRow = {
    message_id: string;
    user_id: string;
    status: "delivered" | "read";
    updated_at: string;
  };

  return (data ?? []).map((row: ReceiptRow) => ({
    messageId: row.message_id,
    userId: row.user_id,
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

export function subscribeToReceipts(
  conversationId: string,
  onReceiptChange: (receipt: MessageReceipt) => void,
): () => void {
  const supabase = createBrowserSupabaseClient();

  let unsubscribed = false;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      supabase.realtime.setAuth(session.access_token);
    }

    if (unsubscribed) return;

    channel = supabase
      .channel(`receipts:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_receipts" },
        (payload) => {
          const row = payload.new as {
            message_id: string;
            user_id: string;
            status: "delivered" | "read";
            updated_at: string;
          };
          if (!row) return;
          onReceiptChange({
            messageId: row.message_id,
            userId: row.user_id,
            status: row.status,
            updatedAt: row.updated_at,
          });
        },
      )
      .subscribe();
  })();

  return () => {
    unsubscribed = true;
    if (channel) supabase.removeChannel(channel);
  };
}
