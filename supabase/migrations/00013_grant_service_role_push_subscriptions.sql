-- service_roleがpush_subscriptionsを読み取れるようにする。
-- send-push-notification Edge Functionは、通知対象の購読情報を
-- 全ユーザー分横断して読む必要があるため、RLSをバイパスできる
-- service_roleでアクセスする設計になっている。
grant select on public.push_subscriptions to service_role;
