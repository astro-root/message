"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConversations } from "@/features/messaging/application/get-conversations";
import type { ConversationSummary } from "@/features/messaging/domain/message";

export function ConversationList({ currentUserId }: { currentUserId: string }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConversations(currentUserId)
      .then(setConversations)
      .catch((e) => setError(e instanceof Error ? e.message : "取得に失敗しました。"))
      .finally(() => setLoading(false));
  }, [currentUserId]);

  if (loading) {
    return <p className="text-sm text-neutral-400">読み込み中...</p>;
  }

  if (error) {
    return (
      <p className="rounded-xl border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
        {error}
      </p>
    );
  }

  if (conversations.length === 0) {
    return <p className="text-sm text-neutral-400">会話がまだありません。</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-800">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={`/conversations/${c.id}?otherUserId=${c.otherUserId}`}
            className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-neutral-900"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-sm font-medium text-blue-100">
              {c.otherUserDisplayName.slice(0, 1)}
            </span>
            <span className="flex flex-col">
              <span className="text-neutral-100">{c.otherUserDisplayName}</span>
              <span className="text-xs text-neutral-500">新しいメッセージ</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
