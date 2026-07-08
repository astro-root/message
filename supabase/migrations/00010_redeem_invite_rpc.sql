-- 招待コードの redeem（消費）を単一トランザクションで安全に行うRPC。
-- 通常のクライアント権限では conversations / conversation_members への
-- INSERTポリシーが存在しないため、SECURITY DEFINERで権限を一時的に借りる。
-- for update でロックを取ることで、同じ招待コードの同時多重消費を防ぐ。

create or replace function public.redeem_invite(_code text)
returns table (conversation_id uuid, other_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  _invite invites%rowtype;
  _conversation_id uuid;
begin
  select * into _invite from invites where code = _code for update;

  if _invite is null then
    raise exception 'invite_not_found';
  end if;

  if _invite.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  if _invite.used_by is not null then
    raise exception 'invite_already_used';
  end if;

  if _invite.created_by = auth.uid() then
    raise exception 'cannot_redeem_own_invite';
  end if;

  -- 既にこの2人の間にdirect会話があれば、それを再利用する
  select c.id into _conversation_id
  from conversations c
  join conversation_members cm1
    on cm1.conversation_id = c.id and cm1.user_id = _invite.created_by
  join conversation_members cm2
    on cm2.conversation_id = c.id and cm2.user_id = auth.uid()
  where c.type = 'direct'
  limit 1;

  if _conversation_id is null then
    insert into conversations (id, type, created_by)
    values (gen_random_uuid(), 'direct', _invite.created_by)
    returning id into _conversation_id;

    insert into conversation_members (conversation_id, user_id, role)
    values
      (_conversation_id, _invite.created_by, 'member'),
      (_conversation_id, auth.uid(), 'member');
  end if;

  update invites
  set used_by = auth.uid(), used_at = now()
  where code = _code;

  return query select _conversation_id, _invite.created_by;
end;
$$;

grant execute on function public.redeem_invite(text) to authenticated;
