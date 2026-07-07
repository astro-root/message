/**
 * サーバー上のメッセージ表現（本文は常に暗号化済み）。
 */
export type EncryptedMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  createdAt: string;
};

/**
 * 復号済み、アプリ内で表示するためのメッセージ。
 * plaintextはこの端末のメモリ上にのみ存在し、保存・送信されることはない。
 */
export type DecryptedMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  plaintext: string;
  createdAt: string;
};

/**
 * 会話の一覧表示用（direct = 1対1のみを今回の対象とする）。
 */
export type ConversationSummary = {
  id: string;
  otherUserId: string;
  otherUserDisplayName: string;
};
