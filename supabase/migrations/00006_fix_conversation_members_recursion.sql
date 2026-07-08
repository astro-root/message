-- conversation_membersのSELECTポリシーが自分自身をサブクエリで参照しており、
-- RLSの再適用によって無限再帰が発生していた。
-- SECURITY DEFINER関数でメンバーシップ判定をRLSの外側に切り出すことで解消する。

create or replace function public.is_conversation_member(_conversation_id uuid, _user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = _conversation_id
      and user_id = _user_id
  );
$$;

drop policy if exists conversation_members_select_member on conversation_members;
create policy conversation_members_select_member on conversation_members
    for select using (
      public.is_conversation_member(conversation_id, auth.uid())
    );
