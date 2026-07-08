import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";
import type { EncryptedMessage } from "@/features/messaging/domain/message";

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  return new Uint8Array(Buffer.from(clean, "hex"));
}

function bytesToHex(bytes: Uint8Array): string {
  return "\\x" + Buffer.from(bytes).toString("hex");
}

export async function fetchMessages(
  conversationId: string,
): Promise<EncryptedMessage[]> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, ciphertext, nonce, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`メッセージの取得に失敗しました: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    ciphertext: hexToBytes(row.ciphertext),
    nonce: hexToBytes(row.nonce),
    createdAt: row.created_at,
  }));
}

export async function sendEncryptedMessage(
  conversationId: string,
  senderId: string,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    ciphertext: bytesToHex(ciphertext),
    nonce: bytesToHex(nonce),
    message_type: "text",
  });

  if (error) {
    throw new Error(`メッセージの送信に失敗しました: ${error.message}`);
  }
}

export function subscribeToNewMessages(
  conversationId: string,
  onNewMessage: (message: EncryptedMessage) => void,
): () => void {
  const supabase = createBrowserSupabaseClient();

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        console.log("[debug] realtime payload received:", payload);
        const row = payload.new as any;
        onNewMessage({
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          ciphertext: hexToBytes(row.ciphertext),
          nonce: hexToBytes(row.nonce),
          createdAt: row.created_at,
        });
      },
    )
    .subscribe((status, err) => {
      console.log("[debug] realtime subscription status:", status, err);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
