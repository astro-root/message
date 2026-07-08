import { createClient as createBrowserSupabaseClient } from "@/shared/infrastructure/supabase/client";
import type { PushSubscriptionData } from "@/features/notification/domain/subscription";

/**
 * base64url文字列をUint8Arrayに変換する。
 * PushManager.subscribe()のapplicationServerKeyに必要な形式。
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

/**
 * ブラウザのService Workerを登録し、Push購読を行う。
 * 通知許可がすでに拒否されている場合はnullを返す。
 */
export async function subscribeToPush(): Promise<PushSubscriptionData | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("この端末はプッシュ通知に対応していません。");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("VAPID公開鍵が設定されていません。");
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON();

  return {
    endpoint: json.endpoint!,
    p256dhKey: json.keys!.p256dh!,
    authKey: json.keys!.auth!,
  };
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionData,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.p256dhKey,
      auth_key: subscription.authKey,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    throw new Error(`プッシュ通知の登録に失敗しました: ${error.message}`);
  }
}
