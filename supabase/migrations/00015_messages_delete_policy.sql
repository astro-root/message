-- 自分が送ったメッセージのみ、論理削除（deleted_atの設定）を許可する。
-- 物理削除ではなく、相手側に「削除されました」という状態を示すため。
create policy messages_update_own on messages
    for update using (auth.uid() = sender_id)
    with check (auth.uid() = sender_id);
