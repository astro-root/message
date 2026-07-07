-- 拡張機能: UUID生成
create extension if not exists "pgcrypto";

-- ユーザー（公開情報のみ。機微な鍵情報はuser_keysに分離する）
create table users (
    id uuid primary key default gen_random_uuid(),
    username text not null unique,
    display_name text not null,
    avatar_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- E2EE用の公開鍵（第一段階: X25519の公開鍵1本のみを保持する簡易設計）
-- 秘密鍵はここには存在しない。クライアントのローカルストレージにのみ存在する。
create table user_keys (
    user_id uuid primary key references users(id) on delete cascade,
    public_key bytea not null,
    key_version int not null default 1,
    rotated_at timestamptz not null default now()
);

-- 会話（1対1 or グループ）
create table conversations (
    id uuid primary key default gen_random_uuid(),
    type text not null check (type in ('direct', 'group')),
    created_by uuid not null references users(id),
    created_at timestamptz not null default now()
);

-- 会話メンバーシップ
create table conversation_members (
    conversation_id uuid not null references conversations(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    role text not null default 'member' check (role in ('member', 'admin')),
    joined_at timestamptz not null default now(),
    primary key (conversation_id, user_id)
);

-- メッセージ（本文は常に暗号化済み。サーバーはciphertextの中身を復号できない）
create table messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references conversations(id) on delete cascade,
    sender_id uuid not null references users(id),
    ciphertext bytea not null,
    nonce bytea not null,
    message_type text not null default 'text' check (message_type in ('text', 'image', 'video')),
    media_path text,
    created_at timestamptz not null default now(),
    edited_at timestamptz,
    deleted_at timestamptz
);

-- 既読・配信状態
create table message_receipts (
    message_id uuid not null references messages(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    status text not null check (status in ('delivered', 'read')),
    updated_at timestamptz not null default now(),
    primary key (message_id, user_id)
);

-- 招待コード（電話番号を使わない連絡先追加のため）
create table invites (
    code text primary key,
    created_by uuid not null references users(id),
    expires_at timestamptz not null,
    used_by uuid references users(id),
    used_at timestamptz,
    created_at timestamptz not null default now()
);

-- Webプッシュ通知の購読情報
create table push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    endpoint text not null,
    p256dh_key text not null,
    auth_key text not null,
    created_at timestamptz not null default now()
);
