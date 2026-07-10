import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";

function bytesToBase64Url(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from([...binary].map((c) => c.charCodeAt(0)));
}

/**
 * 暗号化済みの画像データをStorageにアップロードする。
 * nonceは復号に必須だが専用のDB列が無いため、ファイル名に
 * base64url形式で埋め込む（{conversation_id}/{message_id}.{nonce}.enc）。
 */
export async function uploadEncryptedMedia(
  conversationId: string,
  messageId: string,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): Promise<string> {
  const supabase = createBrowserSupabaseClient();

  const nonceStr = bytesToBase64Url(nonce);
  const path = `${conversationId}/${messageId}.${nonceStr}.enc`;

  const { error } = await supabase.storage
    .from("message-media")
    .upload(path, ciphertext, { contentType: "application/octet-stream" });

  if (error) {
    throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  }

  return path;
}

export async function downloadEncryptedMedia(
  mediaPath: string,
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase.storage
    .from("message-media")
    .download(mediaPath);

  if (error || !data) {
    throw new Error(`画像の取得に失敗しました: ${error?.message ?? "不明なエラー"}`);
  }

  const ciphertext = new Uint8Array(await data.arrayBuffer());

  // ファイル名末尾の .{nonce}.enc からnonceを抽出する
  const match = mediaPath.match(/\.([A-Za-z0-9_-]+)\.enc$/);
  if (!match) {
    throw new Error("画像のnonceを取得できませんでした。");
  }
  const nonce = base64UrlToBytes(match[1]);

  return { ciphertext, nonce };
}
