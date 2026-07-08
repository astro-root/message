import { createInvite as createInviteRepository } from "@/features/contacts/infrastructure/invite-repository";
import type { Invite } from "@/features/contacts/domain/invite";

export type CreateInviteResult =
  | { success: true; invite: Invite }
  | { success: false; message: string };

export async function createInvite(userId: string): Promise<CreateInviteResult> {
  try {
    const invite = await createInviteRepository(userId);
    return { success: true, invite };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "招待コードの作成に失敗しました。";
    return { success: false, message };
  }
}
