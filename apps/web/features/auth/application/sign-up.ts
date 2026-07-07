import {
  validateUsername,
  validateDisplayName,
  validatePassword,
  validateEmail,
} from "@/features/auth/domain/validation";
import type { AuthUser, SignUpInput } from "@/features/auth/domain/user";
import { signUp as signUpRepository } from "@/features/auth/infrastructure/auth-repository";

export type SignUpResult =
  | { success: true; user: AuthUser }
  | { success: false; message: string };

/**
 * サインアップのユースケース。
 * バリデーション -> infrastructure呼び出し、の順で責務を分離する。
 */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const validations = [
    validateEmail(input.email),
    validatePassword(input.password),
    validateUsername(input.username),
    validateDisplayName(input.displayName),
  ];

  const firstError = validations.find((v) => !v.valid);
  if (firstError && !firstError.valid) {
    return { success: false, message: firstError.message };
  }

  try {
    const user = await signUpRepository(input);
    return { success: true, user };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "サインアップに失敗しました。";
    return { success: false, message };
  }
}
