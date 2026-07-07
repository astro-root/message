"use client";

import { useEffect, useRef, useState } from "react";
import { getDecryptedMessages } from "@/features/messaging/application/get-messages";
import { sendMessage } from "@/features/messaging/application/send-message";
import { subscribeToNewMessages } from "@/features/messaging/infrastructure/message-repository";
import { decryptMessage } from "@/features/messaging/infrastructure/message-crypto";
import { loadKeyPair } from "@/features/crypto/infrastructure/local-key-store";
import { fetchPublicKey } from "@/features/crypto/infrastructure/public-key-repository";
import type { DecryptedMessage } from "@/features/messaging/domain/message";

type Props = {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
};

export function ChatWindow({ conversationId, currentUserId, otherUserId }: Props) {
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDecryptedMessages(conversationId, currentUserId, otherUserId)
      .then(setMessages)
      .catch((e) => setError(e instanceof Error ? e.message : "取得に失敗しました。"));

    const unsubscribe = subscribeToNewMessages(conversationId, async (encrypted) => {
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
      } catch {
        // 復号できない新着は無視する
      }
    });

    return unsubscribe;
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

    // 自分の送信分は即座に画面に反映（Realtimeの折り返しを待たない）
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        conversationId,
        senderId: currentUserId,
        plaintext: text,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

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
            return (
              <div
                key={m.id}
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  isMine
                    ? "self-end bg-teal-700 text-white"
                    : "self-start bg-neutral-800 text-neutral-100"
                }`}
              >
                {m.plaintext}
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
