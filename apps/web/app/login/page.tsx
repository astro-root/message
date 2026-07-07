import { SignInForm } from "@/features/auth/presentation/SignInForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">
          ログイン
        </h1>
      </div>
      <SignInForm />
    </main>
  );
}
