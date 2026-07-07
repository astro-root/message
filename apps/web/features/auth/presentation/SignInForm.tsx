"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/features/auth/application/sign-in";
import { initializeKeysIfNeeded } from "@/features/crypto/application/initialize-keys";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result = await signIn({ email, password });

    if (!result.success) {
      setSubmitting(false);
      setError(result.message);
      return;
    }

    // ログイン時にも鍵の存在を確認し、無ければ初期化する。
    // （GRANT不足など過去の失敗で鍵が未登録のまま残っているケースを救済する）
    try {
      await initializeKeysIfNeeded(result.user.id);
    } catch (keyError) {
      console.error("鍵の初期化に失敗しました:", keyError);
    }

    setSubmitting(false);
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          placeholder="パスワード"
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-md bg-teal-600 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "ログイン中..." : "ログイン"}
      </button>
    </form>
  );
}
