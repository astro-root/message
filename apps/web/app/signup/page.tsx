import { SignUpForm } from "@/features/auth/presentation/SignUpForm";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">
          アカウントを作成
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          メッセージは常に暗号化され、サーバーには残りません。
        </p>
      </div>
      <SignUpForm />
    </main>
  );
}
