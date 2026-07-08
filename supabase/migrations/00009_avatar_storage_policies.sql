-- avatarsバケット（Storage）用のRLSポリシー。
-- 画像自体は誰でも閲覧できる公開設定だが、
-- 書き込み（insert/update/delete）は自分のuser_idを
-- パスの先頭フォルダに持つファイルに限定する。
-- 例: avatars/{user_id}/profile.png
--
-- バケット作成時（ダッシュボードUI、Public bucket指定）に
-- 同名のSELECTポリシーが自動生成されていることがあるため、
-- 冪等にするためdrop if existsを先に行う。

drop policy if exists "avatar images are publicly accessible" on storage.objects;
create policy "avatar images are publicly accessible"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "users can upload their own avatar" on storage.objects;
create policy "users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can update their own avatar" on storage.objects;
create policy "users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "users can delete their own avatar" on storage.objects;
create policy "users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
