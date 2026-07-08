import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";

/**
 * avatarsバケットへのアップロード。
 * パスは必ず {user_id}/{ファイル名} の形式にする
 * （Storage RLSポリシーがこの形式を前提にしているため）。
 */
export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  const supabase = createBrowserSupabaseClient();

  const fileExt = file.name.split(".").pop();
  const filePath = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw new Error(`アバターのアップロードに失敗しました: ${uploadError.message}`);
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ avatar_path: filePath, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`プロフィールの更新に失敗しました: ${updateError.message}`);
  }

  return filePath;
}

export function getAvatarPublicUrl(avatarPath: string): string {
  const supabase = createBrowserSupabaseClient();
  const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
  return data.publicUrl;
}
