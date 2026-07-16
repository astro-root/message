export type MessageType = "text" | "image";

export type EncryptedMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  createdAt: string;
  messageType: MessageType;
  mediaPath: string | null;
  deletedAt: string | null;
  replyToMessageId: string | null;
};

export type DecryptedMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  createdAt: string;
  messageType: MessageType;
  plaintext?: string;
  imageObjectUrl?: string;
  isDeleted: boolean;
  replyToMessageId: string | null;
  replyPreviewText?: string;
};

export type ConversationSummary = {
  id: string;
  otherUserId: string;
  otherUserDisplayName: string;
};
