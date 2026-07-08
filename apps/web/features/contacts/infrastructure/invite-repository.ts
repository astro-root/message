import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";
import type { Invite, RedeemInviteResult } from "@/features/contacts/domain/invite";

/**
 * ランダムな招待コードを生成する（8文字、読み間違えやすい文字を除外）。
 */
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // I, O, 0, 1 を除外
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createInvite(userId: string): Promise<Invite> {
  const supabase = createBrowserSupabaseClient();

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24時間後

  const { error } = await supabase.from("invites").insert({
    code,
    created_by: userId,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`招待コードの作成に失敗しました: ${error.message}`);
  }

  return { code, expiresAt };
}

export async function redeemInvite(code: string): Promise<RedeemInviteResult> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase.rpc("redeem_invite", { _code: code });

  if (error) {
    // RPC内のraise exceptionはerror.messageにそのまま入る
    throw new Error(mapRedeemErrorMessage(error.message));
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    conversationId: row.conversation_id,
    otherUserId: row.other_user_id,
  };
}

function mapRedeemErrorMessage(rawMessage: string): string {
  if (rawMessage.includes("invite_not_found")) {
    return "招待コードが見つかりません。";
  }
  if (rawMessage.includes("invite_expired")) {
    return "この招待コードは期限切れです。";
  }
  if (rawMessage.includes("invite_already_used")) {
    return "この招待コードはすでに使用されています。";
  }
  if (rawMessage.includes("cannot_redeem_own_invite")) {
    return "自分自身の招待コードは使用できません。";
  }
  return "招待コードの利用に失敗しました。";
}
