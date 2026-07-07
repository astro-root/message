import { generateKeyPair } from "@/features/crypto/infrastructure/sodium";
import {
  saveKeyPair,
  loadKeyPair,
} from "@/features/crypto/infrastructure/local-key-store";
import { uploadPublicKey } from "@/features/crypto/infrastructure/public-key-repository";

/**
 * サインアップ直後、この端末で一度だけ呼ばれるユースケース。
 * 1. 既にこの端末に鍵があれば何もしない（再生成による事故を防ぐ）
 * 2. なければX25519鍵ペアを生成
 * 3. 秘密鍵はIndexedDBに保存（この端末の外に出ない）
 * 4. 公開鍵のみサーバーに送信
 */
export async function initializeKeysIfNeeded(userId: string): Promise<void> {
  const existing = await loadKeyPair(userId);
  if (existing) {
    return;
  }

  const keyPair = await generateKeyPair();
  await saveKeyPair(userId, keyPair);
  await uploadPublicKey(userId, keyPair.publicKey);
}
