-- Supabase CLI経由のマイグレーションでは、anon/authenticatedロールへの
-- デフォルト権限（GRANT）が引き継がれないことがある。
-- RLSポリシーとは別に、テーブル自体へのCRUD権限を明示的に付与する。
-- 実際にどの行を読み書きできるかはRLSポリシーが制御するため、
-- ここでのGRANTは「門を開ける」だけで、セキュリティの本体はRLS側にある。

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

grant select
  on all tables in schema public
  to anon;

grant usage, select
  on all sequences in schema public
  to authenticated;
