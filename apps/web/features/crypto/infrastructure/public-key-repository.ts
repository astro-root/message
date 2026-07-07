import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";

/**
 * user_keysテーブルへの公開鍵の登録・取得。
 * ここで扱うのは常に公開鍵（Uint8Array）のみで、秘密鍵は一切扱わない。
 */

export async function uploadPublicKey(
  userId: string,
  publicKey: Uint8Array,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase.from("user_keys").upsert({
    user_id: userId,
    public_key: Buffer.from(publicKey).toString("hex"),
  });

  if (error) {
    throw new Error(`公開鍵の登録に失敗しました: ${error.message}`);
  }
}

export async function fetchPublicKey(
  userId: string,
): Promise<Uint8Array | null> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("user_keys")
    .select("public_key")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return new Uint8Array(Buffer.from(data.public_key, "hex"));
}
