-- リプライ（引用返信）機能のため、返信先メッセージIDを保持する列を追加する。
alter table messages
  add column reply_to_message_id uuid references messages(id) on delete set null;
