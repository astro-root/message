import { fetchConversations } from "@/features/messaging/infrastructure/conversation-repository";
import type { ConversationSummary } from "@/features/messaging/domain/message";

export async function getConversations(
  currentUserId: string,
): Promise<ConversationSummary[]> {
  return fetchConversations(currentUserId);
}
