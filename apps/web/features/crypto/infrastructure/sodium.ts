import _sodium from "libsodium-wrappers";
import type { KeyPair } from "@/features/crypto/domain/keypair";

/**
 * libsodiumはWASMの初期化が非同期のため、
 * 使う前に必ずready()を待つ必要がある。
 */
async function getSodium() {
  await _sodium.ready;
  return _sodium;
}

/**
 * X25519の鍵ペアを新規生成する。
 * これはユーザー登録直後、その端末で一度だけ呼ばれる想定。
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const sodium = await getSodium();
  const keys = sodium.crypto_box_keypair();
  return {
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
  };
}
