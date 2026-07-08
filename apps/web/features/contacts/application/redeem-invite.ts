import { redeemInvite as redeemInviteRepository } from "@/features/contacts/infrastructure/invite-repository";
import type { RedeemInviteResult } from "@/features/contacts/domain/invite";

export type RedeemInviteUseCaseResult =
  | { success: true; result: RedeemInviteResult }
  | { success: false; message: string };

export async function redeemInvite(code: string): Promise<RedeemInviteUseCaseResult> {
  const trimmed = code.trim().toUpperCase();

  if (trimmed.length === 0) {
    return { success: false, message: "招待コードを入力してください。" };
  }

  try {
    const result = await redeemInviteRepository(trimmed);
    return { success: true, result };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "招待コードの利用に失敗しました。";
    return { success: false, message };
  }
}
