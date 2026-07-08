import { uploadAvatar } from "@/features/profile/infrastructure/avatar-repository";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type UploadAvatarResult =
  | { success: true; avatarPath: string }
  | { success: false; message: string };

export async function uploadAvatarWithValidation(
  userId: string,
  file: File,
): Promise<UploadAvatarResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      message: "JPEG、PNG、WebP形式の画像のみアップロードできます。",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      message: "ファイルサイズは5MB以下にしてください。",
    };
  }

  try {
    const avatarPath = await uploadAvatar(userId, file);
    return { success: true, avatarPath };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "アップロードに失敗しました。";
    return { success: false, message };
  }
}
