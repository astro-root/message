"use client";

import { useEffect, useRef, useState } from "react";
import { getDecryptedMessages } from "@/features/messaging/application/get-messages";
import { sendMessage } from "@/features/messaging/application/send-message";
import { sendImageMessage } from "@/features/messaging/application/send-image-message";
import {
  subscribeToNewMessages,
  deleteMessage,
} from "@/features/messaging/infrastructure/message-repository";
import { decryptMessage } from "@/features/messaging/infrastructure/message-crypto";
import { decryptMedia } from "@/features/messaging/infrastructure/media-crypto";
import { downloadEncryptedMedia } from "@/features/messaging/infrastructure/media-repository";
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [replyTarget, setReplyTarget] = useState<DecryptedMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        if (encrypted.deletedAt) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === encrypted.id ? { ...m, isDeleted: true } : m,
            ),
          );
          return;
        }

        const myKeyPair = await loadKeyPair(currentUserId);
        const senderPublicKey = await fetchPublicKey(encrypted.senderId);
        if (!myKeyPair || !senderPublicKey) return;

        relevantMessageIdsRef.current.add(encrypted.id);

        if (encrypted.messageType === "image") {
          if (!encrypted.mediaPath) return;
          const { ciphertext, nonce } = await downloadEncryptedMedia(encrypted.mediaPath);
          const imageBytes = await decryptMedia(
            ciphertext,
            nonce,
            senderPublicKey,
            myKeyPair.privateKey,
          );
          const imageObjectUrl = URL.createObjectURL(
            new Blob([new Uint8Array(imageBytes).buffer as ArrayBuffer]),
          );

          setMessages((prev) => [
            ...prev,
            {
              id: encrypted.id,
              conversationId: encrypted.conversationId,
              senderId: encrypted.senderId,
              createdAt: encrypted.createdAt,
              messageType: "image",
              imageObjectUrl,
              isDeleted: false,
              replyToMessageId: encrypted.replyToMessageId,
              replyPreviewText: encrypted.replyToMessageId ? "画像" : undefined,
            },
          ]);
        } else {
          const plaintext = await decryptMessage(
            encrypted.ciphertext,
            encrypted.nonce,
            senderPublicKey,
            myKeyPair.privateKey,
          );

          setMessages((prev) => {
            const replySource = encrypted.replyToMessageId
              ? prev.find((m) => m.id === encrypted.replyToMessageId)
              : undefined;

            return [
              ...prev,
              {
                id: encrypted.id,
                conversationId: encrypted.conversationId,
                senderId: encrypted.senderId,
                createdAt: encrypted.createdAt,
                messageType: "text",
                plaintext,
                isDeleted: false,
                replyToMessageId: encrypted.replyToMessageId,
                replyPreviewText: replySource?.plaintext ?? replySource?.replyPreviewText,
              },
            ];
          });
        }

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
    const replyToId = replyTarget?.id ?? null;
    setInput("");
    setReplyTarget(null);

    const result = await sendMessage(
      conversationId,
      currentUserId,
      otherUserId,
      text,
      replyToId,
    );

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
        createdAt: new Date().toISOString(),
        messageType: "text",
        plaintext: text,
        isDeleted: false,
        replyToMessageId: replyToId,
        replyPreviewText: replyToId
          ? messages.find((m) => m.id === replyToId)?.plaintext ??
            messages.find((m) => m.id === replyToId)?.replyPreviewText
          : undefined,
      },
    ]);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setUploadingImage(true);
    setError(null);

    const result = await sendImageMessage(conversationId, currentUserId, otherUserId, file);

    setUploadingImage(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    relevantMessageIdsRef.current.add(result.messageId);

    setMessages((prev) => [
      ...prev,
      {
        id: result.messageId,
        conversationId,
        senderId: currentUserId,
        createdAt: new Date().toISOString(),
        messageType: "image",
        imageObjectUrl: URL.createObjectURL(file),
        isDeleted: false,
        replyToMessageId: null,
      },
    ]);
  }

  async function handleDelete(messageId: string) {
    try {
      await deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true } : m)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました。");
    }
  }

  function scrollToMessage(messageId: string) {
    const el = document.getElementById(`message-${messageId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const lastOwnMessageId = [...messages]
    .reverse()
    .find((m) => m.senderId === currentUserId)?.id;

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-center gap-1.5 border-b border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-3.5 w-3.5"
        >
          <path
            fillRule="evenodd"
            d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
            clipRule="evenodd"
          />
        </svg>
        <span>エンドツーエンドで暗号化されています</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <p className="mb-3 rounded-xl border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-2">
          {messages.map((m) => {
            const isMine = m.senderId === currentUserId;
            const showReadLabel =
              isMine && m.id === lastOwnMessageId && readMessageIds.has(m.id);

            if (m.isDeleted) {
              return (
                <div
                  key={m.id}
                  id={`message-${m.id}`}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <div className="max-w-[75%] rounded-xl border border-neutral-800 px-3 py-2 text-sm italic text-neutral-500">
                    メッセージは削除されました
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                id={`message-${m.id}`}
                className={`group flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                {m.replyToMessageId && (
                  <button
                    type="button"
                    onClick={() => scrollToMessage(m.replyToMessageId!)}
                    className="mb-1 max-w-[75%] truncate rounded-lg border-l-2 border-blue-500 bg-neutral-900 px-2 py-1 text-left text-xs text-neutral-400 hover:bg-neutral-800"
                  >
                    {m.replyPreviewText ?? "元のメッセージ"}
                  </button>
                )}
                <div className="flex items-center gap-1.5">
                  {isMine && (
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="hidden text-neutral-600 hover:text-red-400 group-hover:block"
                      aria-label="削除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                        <path
                          fillRule="evenodd"
                          d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.05 12.607a3 3 0 01-2.991 2.733H8.128a3 3 0 01-2.991-2.733L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                  {m.messageType === "image" && m.imageObjectUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.imageObjectUrl}
                      alt="送信された画像"
                      className="max-w-[75%] rounded-xl"
                    />
                  ) : (
                    <div
                      className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                        isMine ? "bg-blue-700 text-white" : "bg-neutral-800 text-neutral-100"
                      }`}
                    >
                      {m.plaintext}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setReplyTarget(m)}
                    className="hidden text-neutral-600 hover:text-blue-400 group-hover:block"
                    aria-label="返信"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
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

      {replyTarget && (
        <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900 px-4 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-blue-500 pl-2">
            <p className="text-xs text-neutral-500">返信先</p>
            <p className="truncate text-sm text-neutral-300">
              {replyTarget.messageType === "image"
                ? "画像"
                : replyTarget.plaintext}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTarget(null)}
            className="ml-2 text-neutral-500 hover:text-neutral-300"
            aria-label="返信をキャンセル"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L10.94 12l-5.72 5.72a.75.75 0 101.06 1.06L12 13.06l5.72 5.72a.75.75 0 101.06-1.06L13.06 12l5.72-5.72a.75.75 0 00-1.06-1.06L12 10.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-neutral-800 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageSelect}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="flex items-center justify-center rounded-xl border border-neutral-700 px-3 text-neutral-300 transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path
              fillRule="evenodd"
              d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを入力"
          className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          送信
        </button>
      </form>
    </div>
  );
}
