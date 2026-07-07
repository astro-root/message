-- 会話ごとのメッセージ一覧をカーソルベースで取得するための複合インデックス
create index idx_messages_conversation_created
    on messages (conversation_id, created_at desc);

-- ユーザーが参加している会話一覧の取得用
create index idx_conversation_members_user
    on conversation_members (user_id);

-- 招待コードの有効期限チェック用
create index idx_invites_expires_at
    on invites (expires_at);
