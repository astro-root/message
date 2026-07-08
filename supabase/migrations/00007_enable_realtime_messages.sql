-- messagesテーブルへのINSERTをSupabase Realtimeで配信できるようにする。
-- supabase_realtime publicationにテーブルを追加しない限り、
-- postgres_changesの購読は何のイベントも受け取れない。
alter publication supabase_realtime add table messages;
