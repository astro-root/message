import _sodium from "libsodium-wrappers";

async function getSodium() {
  await _sodium.ready;
  return _sodium;
}

/**
 * 送信者の秘密鍵と受信者の公開鍵を使い、crypto_box方式（X25519 + XSalsa20-Poly1305）で暗号化する。
 * nonceは呼び出し側で保存し、復号時に必要になる。
 */
export async function encryptMessage(
  plaintext: string,
  senderPrivateKey: Uint8Array,
  recipientPublicKey: Uint8Array,
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const sodium = await getSodium();
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const messageBytes = sodium.from_string(plaintext);

  const ciphertext = sodium.crypto_box_easy(
    messageBytes,
    nonce,
    recipientPublicKey,
    senderPrivateKey,
  );

  return { ciphertext, nonce };
}

/**
 * 受信者の秘密鍵と送信者の公開鍵を使って復号する。
 */
export async function decryptMessage(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientPrivateKey: Uint8Array,
): Promise<string> {
  const sodium = await getSodium();

  const plaintextBytes = sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    senderPublicKey,
    recipientPrivateKey,
  );

  if (!plaintextBytes) {
    throw new Error("メッセージの復号に失敗しました。鍵が一致しない可能性があります。");
  }

  return sodium.to_string(plaintextBytes);
}
