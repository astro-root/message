/**
 * X25519の鍵ペア。
 * 秘密鍵はドメイン層を通過してもよいが、
 * infrastructure層の外（サーバー、ログ等）に絶対に漏らしてはならない。
 */
export type KeyPair = {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
};

/**
 * サーバーに送信してよいのは公開鍵のみ。
 */
export type PublicKeyRecord = {
  userId: string;
  publicKey: Uint8Array;
  keyVersion: number;
};
