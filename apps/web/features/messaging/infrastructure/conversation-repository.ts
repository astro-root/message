import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";
import type { ConversationSummary } from "@/features/messaging/domain/message";

/**
 * 自分が参加しているdirect（1対1）会話の一覧を取得する。
 * 会話開始UIは後回しにするため、ここでは既存の会話のみを扱う。
 */
export async function fetchConversations(
  currentUserId: string,
): Promise<ConversationSummary[]> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase
    .from("conversation_members")
    .select(
      `
      conversation_id,
      conversations!inner(id, type),
      conversation:conversations!inner(
        conversation_members(user_id, users(id, display_name))
      )
      `,
    )
    .eq("user_id", currentUserId);

  if (error) {
    throw new Error(`会話一覧の取得に失敗しました: ${error.message}`);
  }

  // ネストしたレスポンスから「自分以外のメンバー」を抽出してサマリ化する
  const summaries: ConversationSummary[] = [];

  type ConversationMemberRow = {
    user_id: string;
    users: { id: string; display_name: string } | null;
  };
  type ConversationRow = {
    conversation_id: string;
    conversation?: { conversation_members: ConversationMemberRow[] };
  };

  for (const row of (data ?? []) as unknown as ConversationRow[]) {
    const members = row.conversation?.conversation_members ?? [];
    const otherMember = members.find(
      (m) => m.user_id !== currentUserId,
    );

    if (otherMember?.users) {
      summaries.push({
        id: row.conversation_id,
        otherUserId: otherMember.users.id,
        otherUserDisplayName: otherMember.users.display_name,
      });
    }
  }

  return summaries;
}
