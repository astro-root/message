import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";

/**
 * メッセージ送信後、受信者にプッシュ通知を送るためEdge Functionを呼び出す。
 * 通知の送信に失敗しても、メッセージ送信自体の成功には影響させない
 * （失敗は静かに無視する。通知はベストエフォートの付加機能のため）。
 */
export async function triggerMessageNotification(
  recipientUserId: string,
  senderDisplayName: string,
  conversationId: string,
): Promise<void> {
  try {
    const supabase = createBrowserSupabaseClient();
    await supabase.functions.invoke("send-push-notification", {
      body: {
        recipientUserId,
        title: senderDisplayName,
        body: "新しいメッセージが届きました",
        url: `/conversations/${conversationId}`,
      },
    });
  } catch {
    // 通知失敗はベストエフォートなので無視する
  }
}
