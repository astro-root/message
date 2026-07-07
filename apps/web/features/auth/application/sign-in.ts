import { validateEmail } from "@/features/auth/domain/validation";
import type { AuthUser, SignInInput } from "@/features/auth/domain/user";
import { signIn as signInRepository } from "@/features/auth/infrastructure/auth-repository";

export type SignInResult =
  | { success: true; user: AuthUser }
  | { success: false; message: string };

export async function signIn(input: SignInInput): Promise<SignInResult> {
  const emailCheck = validateEmail(input.email);
  if (!emailCheck.valid) {
    return { success: false, message: emailCheck.message };
  }

  if (input.password.length === 0) {
    return { success: false, message: "パスワードを入力してください。" };
  }

  try {
    const user = await signInRepository(input);
    return { success: true, user };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ログインに失敗しました。メールアドレスとパスワードを確認してください。";
    return { success: false, message };
  }
}
