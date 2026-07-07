alter table users enable row level security;
alter table user_keys enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table message_receipts enable row level security;
alter table invites enable row level security;
alter table push_subscriptions enable row level security;

create policy users_select_all on users
    for select using (true);

create policy users_update_own on users
    for update using (auth.uid() = id);

create policy user_keys_select_all on user_keys
    for select using (true);

create policy user_keys_upsert_own on user_keys
    for insert with check (auth.uid() = user_id);

create policy user_keys_update_own on user_keys
    for update using (auth.uid() = user_id);

create policy conversations_select_member on conversations
    for select using (
        exists (
            select 1 from conversation_members cm
            where cm.conversation_id = conversations.id
              and cm.user_id = auth.uid()
        )
    );

create policy conversation_members_select_member on conversation_members
    for select using (
        exists (
            select 1 from conversation_members cm2
            where cm2.conversation_id = conversation_members.conversation_id
              and cm2.user_id = auth.uid()
        )
    );

create policy messages_select_member on messages
    for select using (
        exists (
            select 1 from conversation_members cm
            where cm.conversation_id = messages.conversation_id
              and cm.user_id = auth.uid()
        )
    );

create policy messages_insert_own on messages
    for insert with check (
        auth.uid() = sender_id
        and exists (
            select 1 from conversation_members cm
            where cm.conversation_id = messages.conversation_id
              and cm.user_id = auth.uid()
        )
    );

create policy message_receipts_select_member on message_receipts
    for select using (
        exists (
            select 1 from messages m
            join conversation_members cm on cm.conversation_id = m.conversation_id
            where m.id = message_receipts.message_id
              and cm.user_id = auth.uid()
        )
    );

create policy message_receipts_upsert_own on message_receipts
    for insert with check (auth.uid() = user_id);

create policy message_receipts_update_own on message_receipts
    for update using (auth.uid() = user_id);

create policy invites_select_own on invites
    for select using (auth.uid() = created_by);

create policy invites_insert_own on invites
    for insert with check (auth.uid() = created_by);

create policy push_subscriptions_own on push_subscriptions
    for all using (auth.uid() = user_id);
