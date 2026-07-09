"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redeemInvite } from "@/features/contacts/application/redeem-invite";

export function InviteRedeemer() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await redeemInvite(code);

    setSubmitting(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    router.push(
      `/conversations/${result.result.conversationId}?otherUserId=${result.result.otherUserId}`,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="招待コードを入力"
        maxLength={8}
        className="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono tracking-widest text-neutral-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />

      {error && (
        <p className="rounded-xl border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "確認中..." : "追加する"}
      </button>
    </form>
  );
}
