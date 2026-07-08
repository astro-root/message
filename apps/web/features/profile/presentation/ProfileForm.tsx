"use client";

import { useEffect, useState } from "react";
import { getProfile } from "@/features/profile/application/get-profile";
import { updateDisplayName } from "@/features/profile/application/update-display-name";

export function ProfileForm({ userId }: { userId: string }) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile(userId).then((profile) => {
      if (profile) {
        setDisplayName(profile.displayName);
        setUsername(profile.username);
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

  if (loading) {
    return <p className="text-sm text-neutral-400">読み込み中...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-neutral-400">ユーザー名</label>
        <p className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-500">
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
          className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {saved && (
        <p className="rounded-md border border-teal-900 bg-teal-950/50 px-3 py-2 text-sm text-teal-300">
          保存しました。
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-md bg-teal-600 px-4 py-2 font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
