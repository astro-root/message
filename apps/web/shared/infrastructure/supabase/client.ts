import { createBrowserClient } from "@supabase/ssr";

/**
 * クライアントコンポーネント(ブラウザ)から使うSupabaseクライアント。
 * anon keyのみを使用し、RLSによってアクセス範囲が制御される。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
