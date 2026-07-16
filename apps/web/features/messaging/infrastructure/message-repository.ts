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
    .select("id, conversation_id, sender_id, ciphertext, nonce, created_at, message_type, media_path, deleted_at")
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
    messageType: row.message_type as "text" | "image",
    mediaPath: row.media_path,
    deletedAt: row.deleted_at,
  }));
}

/**
 * メッセージ行だけを先に作成する（画像の場合、media_pathはこのIDを
 * ファイル名に使うため、先にIDを確定させる必要がある）。
 */
export async function insertMessageRow(
  conversationId: string,
  senderId: string,
  messageType: "text" | "image",
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Promise<string> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      ciphertext: bytesToHex(ciphertext),
      nonce: bytesToHex(nonce),
      message_type: messageType,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`メッセージの送信に失敗しました: ${error.message}`);
  }

  return data.id;
}

export async function updateMessageMediaPath(
  messageId: string,
  mediaPath: string,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase
    .from("messages")
    .update({ media_path: mediaPath })
    .eq("id", messageId);

  if (error) {
    throw new Error(`画像情報の保存に失敗しました: ${error.message}`);
  }
}

export async function sendEncryptedMessage(
  conversationId: string,
  senderId: string,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Promise<string> {
  return insertMessageRow(conversationId, senderId, "text", ciphertext, nonce);
}

/**
 * 自分が送ったメッセージを論理削除する（deleted_atを設定）。
 * ciphertext/nonceは残すが、UIでは削除済みとして扱い、内容を表示しない。
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    throw new Error(`メッセージの削除に失敗しました: ${error.message}`);
  }
}

export function subscribeToNewMessages(
  conversationId: string,
  onNewMessage: (message: EncryptedMessage) => void,
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
          const row = payload.new as any;
          onNewMessage({
            id: row.id,
            conversationId: row.conversation_id,
            senderId: row.sender_id,
            ciphertext: hexToBytes(row.ciphertext),
            nonce: hexToBytes(row.nonce),
            createdAt: row.created_at,
            messageType: row.message_type,
            mediaPath: row.media_path,
            deletedAt: row.deleted_at,
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
