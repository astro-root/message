import { fetchProfile } from "@/features/profile/infrastructure/profile-repository";
import type { Profile } from "@/features/profile/domain/profile";

export async function getProfile(userId: string): Promise<Profile | null> {
  return fetchProfile(userId);
}
