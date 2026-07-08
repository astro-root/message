import webpush from "https://esm.sh/web-push@3.6.7";

/**
 * メッセージ送信時にクライアントから呼ばれるEdge Function。
 * 受信者のpush_subscriptionsを全端末分取得し、Web Pushで通知を送る。
 *
 * 期待するリクエストボディ:
 * {
 *   recipientUserId: string,
 *   title: string,
 *   body: string,
 *   url?: string
 * }
 */

const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(
  "mailto:admin@example.com",
  vapidPublicKey,
  vapidPrivateKey,
);

Deno.serve(async (req) => {
  try {
    const { recipientUserId, title, body, url } = await req.json();

    if (!recipientUserId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "recipientUserId, title, bodyは必須です。" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // service_roleでpush_subscriptionsを取得する（RLSをバイパスして
    // 受信者本人以外からの呼び出しでも配信できるようにするため）
    const res = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${recipientUserId}&select=endpoint,p256dh_key,auth_key`,
      {
        headers: {
          apikey: supabaseServiceRoleKey,
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
        },
      },
    );

    const subscriptions = await res.json();

    const results = await Promise.allSettled(
      subscriptions.map((sub: any) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
          },
          JSON.stringify({ title, body, url }),
        ),
      ),
    );

    return new Response(JSON.stringify({ sent: results.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
