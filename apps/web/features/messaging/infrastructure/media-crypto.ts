import _sodium from "libsodium-wrappers";

async function getSodium() {
  await _sodium.ready;
  return _sodium;
}

/**
 * 画像などのバイナリデータをcrypto_box方式で暗号化する。
 * テキストメッセージと同じ鍵ペアの仕組みを使う。
 */
export async function encryptMedia(
  data: Uint8Array,
  senderPrivateKey: Uint8Array,
  recipientPublicKey: Uint8Array,
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const sodium = await getSodium();
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);

  const ciphertext = sodium.crypto_box_easy(
    data,
    nonce,
    recipientPublicKey,
    senderPrivateKey,
  );

  return { ciphertext, nonce };
}

export async function decryptMedia(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  senderPublicKey: Uint8Array,
  recipientPrivateKey: Uint8Array,
): Promise<Uint8Array> {
  const sodium = await getSodium();

  const plaintext = sodium.crypto_box_open_easy(
    ciphertext,
    nonce,
    senderPublicKey,
    recipientPrivateKey,
  );

  if (!plaintext) {
    throw new Error("画像の復号に失敗しました。");
  }

  return plaintext;
}
