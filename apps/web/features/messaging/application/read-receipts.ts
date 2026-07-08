import {
  markMessagesAsRead,
  fetchReceiptsForConversation,
  subscribeToReceipts,
} from "@/features/messaging/infrastructure/receipt-repository";
import type { MessageReceipt } from "@/features/messaging/domain/receipt";

/**
 * 自分宛てのメッセージ（自分が送っていないもの）にのみ既読を付ける。
 */
export async function markReceivedMessagesAsRead(
  messageIds: string[],
  senderIds: string[],
  currentUserId: string,
): Promise<void> {
  const targetIds = messageIds.filter((_, i) => senderIds[i] !== currentUserId);
  await markMessagesAsRead(targetIds, currentUserId);
}

export async function getReceiptsForConversation(
  conversationId: string,
): Promise<MessageReceipt[]> {
  return fetchReceiptsForConversation(conversationId);
}

/**
 * この会話に属するメッセージIDの集合でフィルタしながら、
 * 既読状況の変化をRealtimeで購読する。
 * message_receiptsテーブル自体にconversation_id列が無いため、
 * フィルタはクライアント側（このメッセージIDセットに含まれるか）で行う。
 */
export function subscribeToConversationReceipts(
  conversationId: string,
  relevantMessageIds: Set<string>,
  onReceiptChange: (receipt: MessageReceipt) => void,
): () => void {
  return subscribeToReceipts(conversationId, (receipt) => {
    if (relevantMessageIds.has(receipt.messageId)) {
      onReceiptChange(receipt);
    }
  });
}
