import { signOut as signOutRepository } from "@/features/auth/infrastructure/auth-repository";

export async function signOut(): Promise<void> {
  await signOutRepository();
}
