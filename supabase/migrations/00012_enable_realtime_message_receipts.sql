-- message_receiptsテーブルへの変更をSupabase Realtimeで配信できるようにする。
-- messagesテーブルと同様、publicationに追加しない限りpostgres_changesは届かない。
alter publication supabase_realtime add table message_receipts;
