-- message-mediaバケット（暗号化済み画像・動画）用のRLSポリシー。
-- avatarsと異なり非公開バケットのため、会話の参加者のみが
-- アップロード・ダウンロードできるようにする。
-- パスは {conversation_id}/{message_id}.enc の形式を前提にする。

create policy "conversation members can upload media"
on storage.objects for insert
with check (
  bucket_id = 'message-media'
  and public.is_conversation_member(
    (storage.foldername(name))[1]::uuid,
    auth.uid()
  )
);

create policy "conversation members can view media"
on storage.objects for select
using (
  bucket_id = 'message-media'
  and public.is_conversation_member(
    (storage.foldername(name))[1]::uuid,
    auth.uid()
  )
);
