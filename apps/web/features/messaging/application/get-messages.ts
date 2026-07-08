import { fetchMessages } from "@/features/messaging/infrastructure/message-repository";
import { decryptMessage } from "@/features/messaging/infrastructure/message-crypto";
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

  console.log("[debug] fetched encrypted messages:", encryptedMessages.length);
  console.log("[debug] myPrivateKey length:", myKeyPair.privateKey.length);
  console.log("[debug] otherPublicKey length:", otherPublicKey.length);

  const results: DecryptedMessage[] = [];

  for (const msg of encryptedMessages) {
    try {
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
        plaintext,
        createdAt: msg.createdAt,
      });
    } catch (e) {
      console.error("[debug] decrypt failed for message", msg.id, e);
      continue;
    }
  }

  return results;
}
