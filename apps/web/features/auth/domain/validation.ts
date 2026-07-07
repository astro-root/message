/**
 * ユーザー名のルール:
 * - 3〜20文字
 * - 半角英数字とアンダースコアのみ
 * - 数字始まりは不可（表示上の混乱を避けるため）
 */
const USERNAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]{2,19}$/;

export type ValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validateUsername(username: string): ValidationResult {
  if (!USERNAME_PATTERN.test(username)) {
    return {
      valid: false,
      message:
        "ユーザー名は3〜20文字の半角英数字とアンダースコアのみ使用でき、数字で始めることはできません。",
    };
  }
  return { valid: true };
}

export function validateDisplayName(displayName: string): ValidationResult {
  const trimmed = displayName.trim();
  if (trimmed.length < 1 || trimmed.length > 50) {
    return {
      valid: false,
      message: "表示名は1〜50文字で入力してください。",
    };
  }
  return { valid: true };
}

/**
 * パスワードポリシー: 最低8文字。
 * 複雑さの強制（記号必須など）は、かえって使い回しや付箋メモを誘発しやすいため
 * 意図的に課さない。Supabase Auth側の設定と役割分担する。
 */
export function validatePassword(password: string): ValidationResult {
  if (password.length < 8) {
    return {
      valid: false,
      message: "パスワードは8文字以上で入力してください。",
    };
  }
  return { valid: true };
}

export function validateEmail(email: string): ValidationResult {
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_PATTERN.test(email)) {
    return {
      valid: false,
      message: "メールアドレスの形式が正しくありません。",
    };
  }
  return { valid: true };
}
