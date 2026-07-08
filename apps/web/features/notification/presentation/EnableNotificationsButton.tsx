"use client";

import { useState } from "react";
import { enablePushNotifications } from "@/features/notification/application/enable-push-notifications";

export function EnableNotificationsButton({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setMessage(null);

    const result = await enablePushNotifications(userId);

    if (!result.success) {
      setStatus("error");
      setMessage(result.message);
      return;
    }

    setStatus("enabled");
  }

  if (status === "enabled") {
    return (
      <p className="rounded-md border border-teal-900 bg-teal-950/50 px-3 py-2 text-sm text-teal-300">
        通知が有効になりました。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "loading" ? "設定中..." : "通知を有効にする"}
      </button>
      {message && (
        <p className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
          {message}
        </p>
      )}
    </div>
  );
}
