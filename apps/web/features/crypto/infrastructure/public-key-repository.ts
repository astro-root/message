import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";

/**
 * user_keysテーブルへの公開鍵の登録・取得。
 * ここで扱うのは常に公開鍵（Uint8Array）のみで、秘密鍵は一切扱わない。
 *
 * Postgresのbytea型は \x 接頭辞付きのhex文字列でやり取りされる。
 * 書き込み時に \x を付け、読み込み時に \x を取り除く必要がある
 * （message-repository.tsと同じ方式で統一する）。
 */

function bytesToHex(bytes: Uint8Array): string {
  return "\\x" + Buffer.from(bytes).toString("hex");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  return new Uint8Array(Buffer.from(clean, "hex"));
}

export async function uploadPublicKey(
  userId: string,
  publicKey: Uint8Array,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase.from("user_keys").upsert({
    user_id: userId,
    public_key: bytesToHex(publicKey),
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

  return hexToBytes(data.public_key);
}
