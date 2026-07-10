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

  for (const msg of encryptedMessages) {
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
        });
      } else {
        const plaintext = await decryptMessage(
          msg.ciphertext,
          msg.nonce,
          otherPublicKey,
          myKeyPair.privateKey,
        );
        results.push({
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          createdAt: msg.createdAt,
          messageType: "text",
          plaintext,
        });
      }
    } catch {
      continue;
    }
  }

  return results;
}
