import { fetchMessages } from "@/features/messaging/infrastructure/message-repository";
import { decryptMessage } from "@/features/messaging/infrastructure/message-crypto";
import { loadKeyPair } from "@/features/crypto/infrastructure/local-key-store";
import { fetchPublicKey } from "@/features/crypto/infrastructure/public-key-repository";
import type { DecryptedMessage } from "@/features/messaging/domain/message";

/**
 * 会話のメッセージを取得し、この端末の秘密鍵で復号する。
 * 復号に失敗した個別のメッセージはスキップし、全体を失敗させない
 * （鍵のずれが1件あっても、他のメッセージは読めるようにするため）。
 */
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
    } catch {
      continue;
    }
  }

  return results;
}
