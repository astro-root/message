import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";
import type { Profile } from "@/features/profile/domain/profile";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_path")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    avatarPath: data.avatar_path,
  };
}

export async function updateDisplayName(
  userId: string,
  displayName: string,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase
    .from("users")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw new Error(`表示名の更新に失敗しました: ${error.message}`);
  }
}
