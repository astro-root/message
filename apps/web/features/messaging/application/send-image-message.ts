import { encryptMedia } from "@/features/messaging/infrastructure/media-crypto";
import { encryptMessage } from "@/features/messaging/infrastructure/message-crypto";
import {
  insertMessageRow,
  updateMessageMediaPath,
} from "@/features/messaging/infrastructure/message-repository";
import { uploadEncryptedMedia } from "@/features/messaging/infrastructure/media-repository";
import { triggerMessageNotification } from "@/features/messaging/infrastructure/notification-trigger";
import { loadKeyPair } from "@/features/crypto/infrastructure/local-key-store";
import { fetchPublicKey } from "@/features/crypto/infrastructure/public-key-repository";
import { getProfile } from "@/features/profile/application/get-profile";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export type SendImageMessageResult =
  | { success: true; messageId: string }
  | { success: false; message: string };

export async function sendImageMessage(
  conversationId: string,
  currentUserId: string,
  recipientUserId: string,
  file: File,
): Promise<SendImageMessageResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      message: "JPEG、PNG、WebP、GIF形式の画像のみ送信できます。",
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { success: false, message: "画像サイズは10MB以下にしてください。" };
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
    // messages行はダミーのciphertext/nonceで先に作成し、実IDを確定させる
    // （StorageのファイルパスにこのIDを含めるため）
    const dummy = await encryptMessage("", myKeyPair.privateKey, recipientPublicKey);
    const messageId = await insertMessageRow(
      conversationId,
      currentUserId,
      "image",
      dummy.ciphertext,
      dummy.nonce,
    );

    const imageBytes = new Uint8Array(await file.arrayBuffer());
    const { ciphertext, nonce } = await encryptMedia(
      imageBytes,
      myKeyPair.privateKey,
      recipientPublicKey,
    );

    const mediaPath = await uploadEncryptedMedia(
      conversationId,
      messageId,
      ciphertext,
      nonce,
    );

    await updateMessageMediaPath(messageId, mediaPath);

    const myProfile = await getProfile(currentUserId);
    if (myProfile) {
      triggerMessageNotification(recipientUserId, myProfile.displayName, conversationId);
    }

    return { success: true, messageId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "画像の送信に失敗しました。";
    return { success: false, message };
  }
}
