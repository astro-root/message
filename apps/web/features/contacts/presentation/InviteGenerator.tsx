"use client";

import { useState } from "react";
import { createInvite } from "@/features/contacts/application/create-invite";

export function InviteGenerator({ userId }: { userId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setCopied(false);

    const result = await createInvite(userId);

    setGenerating(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setCode(result.invite.code);
  }

  async function handleCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="rounded-md bg-teal-600 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {generating ? "発行中..." : "招待コードを発行"}
      </button>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {code && (
        <div className="flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950 px-4 py-3">
          <span className="font-mono text-lg tracking-widest text-neutral-100">
            {code}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-sm text-teal-400 hover:text-teal-300"
          >
            {copied ? "コピーしました" : "コピー"}
          </button>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        このコードは24時間有効で、1回だけ使用できます。
      </p>
    </div>
  );
}
