"use client";

import { useEffect, useRef, useState } from "react";
import { getDecryptedMessages } from "@/features/messaging/application/get-messages";
import { sendMessage } from "@/features/messaging/application/send-message";
import { subscribeToNewMessages } from "@/features/messaging/infrastructure/message-repository";
import { decryptMessage } from "@/features/messaging/infrastructure/message-crypto";
import { loadKeyPair } from "@/features/crypto/infrastructure/local-key-store";
import { fetchPublicKey } from "@/features/crypto/infrastructure/public-key-repository";
import {
  markReceivedMessagesAsRead,
  getReceiptsForConversation,
  subscribeToConversationReceipts,
} from "@/features/messaging/application/read-receipts";
import type { DecryptedMessage } from "@/features/messaging/domain/message";

type Props = {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
};

export function ChatWindow({ conversationId, currentUserId, otherUserId }: Props) {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [readMessageIds, setReadMessageIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const relevantMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let receiptUnsubscribe: (() => void) | null = null;

    getDecryptedMessages(conversationId, currentUserId, otherUserId).then(
      async (fetched) => {
        setMessages(fetched);

        const messageIds = fetched.map((m) => m.id);
        const senderIds = fetched.map((m) => m.senderId);
        await markReceivedMessagesAsRead(messageIds, senderIds, currentUserId);

        messageIds.forEach((id) => relevantMessageIdsRef.current.add(id));

        const receipts = await getReceiptsForConversation(conversationId);
        const readIds = new Set(
          receipts.filter((r) => r.status === "read").map((r) => r.messageId),
        );
        setReadMessageIds(readIds);

        receiptUnsubscribe = subscribeToConversationReceipts(
          conversationId,
          relevantMessageIdsRef.current,
          (receipt) => {
            if (receipt.status === "read") {
              setReadMessageIds((prev) => new Set(prev).add(receipt.messageId));
            }
          },
        );
      },
    );

    const messageUnsubscribe = subscribeToNewMessages(conversationId, async (encrypted) => {
      try {
        const myKeyPair = await loadKeyPair(currentUserId);
        const senderPublicKey = await fetchPublicKey(encrypted.senderId);
        if (!myKeyPair || !senderPublicKey) return;

        const plaintext = await decryptMessage(
          encrypted.ciphertext,
          encrypted.nonce,
          senderPublicKey,
          myKeyPair.privateKey,
        );

        relevantMessageIdsRef.current.add(encrypted.id);

        setMessages((prev) => [
          ...prev,
          {
            id: encrypted.id,
            conversationId: encrypted.conversationId,
            senderId: encrypted.senderId,
            plaintext,
            createdAt: encrypted.createdAt,
          },
        ]);

        if (encrypted.senderId !== currentUserId) {
          await markReceivedMessagesAsRead(
            [encrypted.id],
            [encrypted.senderId],
            currentUserId,
          );
        }
      } catch {
        // 復号できない新着は無視する
      }
    });

    return () => {
      messageUnsubscribe();
      receiptUnsubscribe?.();
    };
  }, [conversationId, currentUserId, otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setSending(true);
    setError(null);
    const text = input;
    setInput("");

    const result = await sendMessage(conversationId, currentUserId, otherUserId, text);

    setSending(false);

    if (!result.success) {
      setError(result.message);
      setInput(text);
      return;
    }

    relevantMessageIdsRef.current.add(result.messageId);

    setMessages((prev) => [
      ...prev,
      {
        id: result.messageId,
        conversationId,
        senderId: currentUserId,
        plaintext: text,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  const lastOwnMessageId = [...messages]
    .reverse()
    .find((m) => m.senderId === currentUserId)?.id;

  return (
    <div className="flex h-screen flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <p className="mb-3 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((m) => {
            const isMine = m.senderId === currentUserId;
            const showReadLabel =
              isMine && m.id === lastOwnMessageId && readMessageIds.has(m.id);

            return (
              <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    isMine ? "bg-teal-700 text-white" : "bg-neutral-800 text-neutral-100"
                  }`}
                >
                  {m.plaintext}
                </div>
                {showReadLabel && (
                  <span className="mt-0.5 text-xs text-neutral-500">既読</span>
                )}
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-neutral-800 p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力"
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-teal-600 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          送信
        </button>
      </form>
    </div>
  );
}
