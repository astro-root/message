/**
 * 認証済みユーザーの最小表現。
 * Supabaseの実装詳細（Session, AuthUser等）に依存しない、
 * アプリ内で使う純粋なドメイン型。
 */
export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
};

/**
 * サインアップ時の入力値。
 */
export type SignUpInput = {
  email: string;
  password: string;
  username: string;
  displayName: string;
};

/**
 * ログイン時の入力値。
 */
export type SignInInput = {
  email: string;
  password: string;
};
