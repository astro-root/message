import { fetchMessages } from "@/features/messaging/infrastructure/message-repository";
import { decryptMessage } from "@/features/messaging/infrastructure/message-crypto";
import { decryptMedia } from "@/features/messaging/infrastructure/media-crypto";
import { downloadEncryptedMedia } from "@/features/messaging/infrastructure/media-repository";
import { loadKeyPair } from "@/features/crypto/infrastructure/local-key-store";
import { fetchPublicKey } from "@/features/crypto/infrastructure/public-key-repository";
import type { DecryptedMessage } from "@/features/messaging/domain/message";

export async function getDecryptedMessages(
  conversationId: string,
  currentUserId: string,
  otherUserId: string,
): Promise<DecryptedMessage[]> {
  const myKeyPair = await loadKeyPair(currentUserId);
  if (!myKeyPair) {
    throw new Error("この端末に鍵が見つかりません。再ログインしてください。");
  }

  const otherPublicKey = await fetchPublicKey(otherUserId);
  if (!otherPublicKey) {
    throw new Error("相手の公開鍵が見つかりません。");
  }

  const encryptedMessages = await fetchMessages(conversationId);

  const results: DecryptedMessage[] = [];
  const plaintextById = new Map<string, string>();

  for (const msg of encryptedMessages) {
    if (msg.deletedAt) {
      results.push({
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        createdAt: msg.createdAt,
        messageType: msg.messageType,
        isDeleted: true,
        replyToMessageId: msg.replyToMessageId,
      });
      continue;
    }

    try {
      if (msg.messageType === "image") {
        if (!msg.mediaPath) continue;

        const { ciphertext, nonce } = await downloadEncryptedMedia(msg.mediaPath);
        const imageBytes = await decryptMedia(
          ciphertext,
          nonce,
          otherPublicKey,
          myKeyPair.privateKey,
        );
        const blob = new Blob([new Uint8Array(imageBytes).buffer as ArrayBuffer]);
        const imageObjectUrl = URL.createObjectURL(blob);

        results.push({
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          createdAt: msg.createdAt,
          messageType: "image",
          imageObjectUrl,
          isDeleted: false,
          replyToMessageId: msg.replyToMessageId,
          replyPreviewText: msg.replyToMessageId ? "画像" : undefined,
        });
      } else {
        const plaintext = await decryptMessage(
          msg.ciphertext,
          msg.nonce,
          otherPublicKey,
          myKeyPair.privateKey,
        );
        plaintextById.set(msg.id, plaintext);

        results.push({
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          createdAt: msg.createdAt,
          messageType: "text",
          plaintext,
          isDeleted: false,
          replyToMessageId: msg.replyToMessageId,
          replyPreviewText: msg.replyToMessageId
            ? plaintextById.get(msg.replyToMessageId)
            : undefined,
        });
      }
    } catch {
      continue;
    }
  }

  return results;
}
