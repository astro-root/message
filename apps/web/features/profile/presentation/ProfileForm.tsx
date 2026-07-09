"use client";

import { useEffect, useRef, useState } from "react";
import { getProfile } from "@/features/profile/application/get-profile";
import { updateDisplayName } from "@/features/profile/application/update-display-name";
import { uploadAvatarWithValidation } from "@/features/profile/application/upload-avatar";
import { getAvatarPublicUrl } from "@/features/profile/infrastructure/avatar-repository";

export function ProfileForm({ userId }: { userId: string }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProfile(userId).then((profile) => {
      if (profile) {
        setDisplayName(profile.displayName);
        setUsername(profile.username);
        if (profile.avatarPath) {
          setAvatarUrl(getAvatarPublicUrl(profile.avatarPath));
        }
      }
      setLoading(false);
    });
  }, [userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const result = await updateDisplayName(userId, displayName);

    setSaving(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setSaved(true);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const result = await uploadAvatarWithValidation(userId, file);

    setUploading(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    // キャッシュ回避のためタイムスタンプを付けて再取得させる
    setAvatarUrl(`${getAvatarPublicUrl(result.avatarPath)}?t=${Date.now()}`);
  }

  if (loading) {
    return <p className="text-sm text-neutral-400">読み込み中...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="group relative h-20 w-20 overflow-hidden rounded-full bg-blue-900 disabled:opacity-50"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="アバター" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-medium text-blue-100">
              {displayName.slice(0, 1)}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? "アップロード中..." : "変更"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-neutral-400">ユーザー名</label>
          <p className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-500">
            @{username}
          </p>
          <p className="text-xs text-neutral-500">ユーザー名は変更できません。</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="displayName" className="text-sm text-neutral-400">
            表示名
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {saved && (
          <p className="rounded-xl border border-blue-900 bg-blue-950/50 px-3 py-2 text-sm text-blue-300">
            保存しました。
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
