import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";
import type { AuthUser, SignInInput, SignUpInput } from "@/features/auth/domain/user";

/**
 * Supabase Authの詳細をここに閉じ込める。
 * application層はこのモジュールの関数だけを知っていればよく、
 * Supabase固有の型（Session, User等）に直接依存しない。
 */

export async function signUp(input: SignUpInput): Promise<AuthUser> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username: input.username,
        display_name: input.displayName,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error("サインアップに失敗しました。時間を置いて再度お試しください。");
  }

  return {
    id: data.user.id,
    email: data.user.email ?? input.email,
    username: input.username,
    displayName: input.displayName,
  };
}

export async function signIn(input: SignInInput): Promise<AuthUser> {
  const supabase = createBrowserSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  // public.usersからusername / display_nameを取得する
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("username, display_name")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("プロフィール情報の取得に失敗しました。");
  }

  return {
    id: data.user.id,
    email: data.user.email ?? input.email,
    username: profile.username,
    displayName: profile.display_name,
  };
}

export async function signOut(): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}
