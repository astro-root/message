import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/shared/infrastructure/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-8 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">設定</h1>
      </div>

      <Link
        href="/profile"
        className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 transition-colors hover:bg-neutral-800"
      >
        プロフィール
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-300">
          プライバシーとデータ
        </h2>
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>広告を表示しません。</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>行動のトラッキングを一切行いません。</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>
              メッセージはエンドツーエンドで暗号化されており、運営者を含め、送信者と受信者以外は内容を読むことができません。
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400">✓</span>
            <span>電話番号の登録は不要です。招待コードで連絡先を追加します。</span>
          </div>
        </div>
      </section>
    </main>
  );
}
