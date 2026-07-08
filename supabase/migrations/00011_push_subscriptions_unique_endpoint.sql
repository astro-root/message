-- upsert(onConflict: "endpoint")を使うため、endpoint列にunique制約を追加する。
-- 同じ端末が複数回購読しても重複登録されず、既存の行が更新されるようにする。
alter table push_subscriptions
  add constraint push_subscriptions_endpoint_key unique (endpoint);
