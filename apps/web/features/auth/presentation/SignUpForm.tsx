"use client";

import { useState } from "react";
import { signUp } from "@/features/auth/application/sign-up";
import { initializeKeysIfNeeded } from "@/features/crypto/application/initialize-keys";

export function SignUpForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signUp({ email, password, username, displayName });

    if (!result.success) {
      setSubmitting(false);
      setError(result.message);
      return;
    }

    // サインアップ成功直後、この端末でE2EE用の鍵ペアを初期化する。
    // 秘密鍵はこの端末のIndexedDBにのみ保存され、サーバーには送られない。
    try {
      await initializeKeysIfNeeded(result.user.id);
    } catch (keyError) {
      // 鍵の初期化に失敗しても、アカウント自体は作成済みなので
      // ユーザーには成功として見せつつ、コンソールには残す。
      // （再ログイン時にも初期化を試みる設計にする）
      console.error("鍵の初期化に失敗しました:", keyError);
    }

    setSubmitting(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-6 text-neutral-100">
        <p className="text-sm text-neutral-300">
          確認メールを送信しました。メール内のリンクからアカウントを有効化してください。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm text-neutral-400">
          ユーザー名
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="taro_yamada"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm text-neutral-400">
          表示名
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="山田太郎"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-neutral-400">
          メールアドレス
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm text-neutral-400">
          パスワード
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="8文字以上"
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "作成中..." : "アカウントを作成"}
      </button>
    </form>
  );
}
