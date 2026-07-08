import { encryptMessage } from "@/features/messaging/infrastructure/message-crypto";
import { sendEncryptedMessage } from "@/features/messaging/infrastructure/message-repository";
import { triggerMessageNotification } from "@/features/messaging/infrastructure/notification-trigger";
import { loadKeyPair } from "@/features/crypto/infrastructure/local-key-store";
import { fetchPublicKey } from "@/features/crypto/infrastructure/public-key-repository";
import { getProfile } from "@/features/profile/application/get-profile";

export type SendMessageResult =
  | { success: true }
  | { success: false; message: string };

export async function sendMessage(
  conversationId: string,
  currentUserId: string,
  recipientUserId: string,
  plaintext: string,
): Promise<SendMessageResult> {
  if (plaintext.trim().length === 0) {
    return { success: false, message: "メッセージを入力してください。" };
  }

  const myKeyPair = await loadKeyPair(currentUserId);
  if (!myKeyPair) {
    return {
      success: false,
      message: "この端末に鍵が見つかりません。再ログインしてください。",
    };
  }

  const recipientPublicKey = await fetchPublicKey(recipientUserId);
  if (!recipientPublicKey) {
    return { success: false, message: "相手の公開鍵が見つかりません。" };
  }

  try {
    const { ciphertext, nonce } = await encryptMessage(
      plaintext,
      myKeyPair.privateKey,
      recipientPublicKey,
    );
    await sendEncryptedMessage(conversationId, currentUserId, ciphertext, nonce);

    // 通知はベストエフォート。失敗してもメッセージ送信自体は成功として扱う。
    const myProfile = await getProfile(currentUserId);
    if (myProfile) {
      triggerMessageNotification(
        recipientUserId,
        myProfile.displayName,
        conversationId,
      );
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "メッセージの送信に失敗しました。";
    return { success: false, message };
  }
}
