import { validateDisplayName } from "@/features/auth/domain/validation";
import { updateDisplayName as updateDisplayNameRepository } from "@/features/profile/infrastructure/profile-repository";

export type UpdateDisplayNameResult =
  | { success: true }
  | { success: false; message: string };

export async function updateDisplayName(
  userId: string,
  displayName: string,
): Promise<UpdateDisplayNameResult> {
  const validation = validateDisplayName(displayName);
  if (!validation.valid) {
    return { success: false, message: validation.message };
  }

  try {
    await updateDisplayNameRepository(userId, displayName.trim());
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "表示名の更新に失敗しました。";
    return { success: false, message };
  }
}
