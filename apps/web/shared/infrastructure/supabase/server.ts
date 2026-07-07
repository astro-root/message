import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server Components / Server Actions / Route Handlers から使うSupabaseクライアント。
 * cookieベースでユーザーのセッションを読み書きする。
 *
 * 注意: Server Componentsから呼ぶ場合、cookieの書き込み(setAll)は
 * 失敗することがある(Server Componentsはcookieを直接変更できないため)。
 * これは想定内のエラーで、Middlewareでセッションのリフレッシュを行っていれば
 * 問題ない。詳細: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Componentからの呼び出しでは無視して良い
            // (Middlewareでセッションリフレッシュを行っている前提)
          }
        },
      },
    },
  );
}
