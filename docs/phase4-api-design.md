# Phase 4: API設計

**フェーズステータス**: 提案（ユーザー承認待ち）
**前提**: Phase 3で確定したテーブル設計・RLSポリシーを踏まえる

---

## 1. API設計の基本方針

Supabaseを採用した場合、従来型の「独自バックエンドサーバーがすべてのAPIを持つ」構成にはならない。以下の2種類を明確に使い分ける。

| 方式 | 用途 | 実装場所 |
|---|---|---|
| Supabaseクライアント直接アクセス（PostgREST + Realtime） | RLSポリシーだけで安全性が担保できる単純なCRUD操作 | クライアント（`infrastructure`層、Phase 2参照） |
| Supabase Edge Functions | 複数テーブルにまたがるトランザクション処理、外部サービス連携（Web Push送信等）、秘密情報を扱う処理 | Supabase（Deno環境のサーバーレス関数） |

**判断基準**: 「クライアントが直接そのテーブルを操作してもRLSで安全に守れるか」を基準にする。守れないもの（招待コードの発行・使用、Push通知の送信）だけをEdge Functionsに切り出す。これにより、無駄にサーバーサイドの処理を増やさず、Phase 2で決めた「オーバーエンジニアリングを避ける」方針と整合させる。

Edge Functionsの無料枠は月50万回の呼び出しまでであり、数十人規模のMVPでは実質的に消費しきれない余裕がある。

---

## 2. Supabaseクライアント直接アクセス（PostgREST）

| 操作 | テーブル | 説明 |
|---|---|---|
| プロフィール取得 | `users` | 公開プロフィール（username, display_name, avatar_path）を取得。RLSにより全員が参照可能 |
| プロフィール更新 | `users` | 自分の行のみ更新可能（RLSで強制） |
| 公開鍵登録・取得 | `user_keys` | E2EE鍵交換のための公開鍵をやり取りする |
| 会話一覧取得 | `conversations`, `conversation_members` | 自分が参加している会話のみ取得（RLS） |
| メッセージ取得 | `messages` | `conversation_id`と`created_at`によるカーソルベースのページネーション |
| メッセージ送信 | `messages` | クライアントで暗号化した`ciphertext`・`nonce`をINSERT。RLSで送信者とメンバーシップを検証 |
| 既読状態更新 | `message_receipts` | 自分の既読状態のみ更新可能 |
| Push購読登録 | `push_subscriptions` | 自分の購読情報のみ登録・更新可能 |

これらはすべてPhase 3のRLSポリシーで保護されているため、追加のAPI層（Express等のサーバー）を経由する必要がない。これがBaaSを採用した最大の利点である。

### メッセージ取得のページネーション例（TypeScript）

```typescript
// domain層: メッセージ取得のインターフェース定義
interface MessageRepository {
  fetchMessages(conversationId: string, beforeCursor: string | null, limit: number): Promise<Message[]>;
}

// infrastructure層: Supabase実装
async function fetchMessages(
  conversationId: string,
  beforeCursor: string | null,
  limit = 50
): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('id, conversation_id, sender_id, ciphertext, nonce, message_type, media_path, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (beforeCursor) {
    query = query.lt('created_at', beforeCursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
```

---

## 3. Edge Functions（サーバーサイド処理）

| 関数名 | トリガー | 処理内容 |
|---|---|---|
| `create-invite` | クライアントからの明示的な呼び出し | ランダムな招待コードを生成し、有効期限（例: 24時間）を設定して`invites`テーブルに保存する |
| `redeem-invite` | クライアントからの明示的な呼び出し | 招待コードの有効性（未使用・未失効）を検証し、`conversations`・`conversation_members`への追加をトランザクション的に行う |
| `send-push-notification` | Database Webhook（`messages`テーブルへのINSERT） | 新規メッセージ挿入をトリガーに、受信者の`push_subscriptions`を参照してWeb Push APIで通知を送信する。通知本文にはメッセージ内容を含めない |
| `delete-account` | クライアントからの明示的な呼び出し | ユーザーに関連する全データ（メッセージ・会話メンバーシップ・鍵・購読情報）を削除する。Phase 3で残課題とした「忘れられる権利」への対応 |

### `redeem-invite` の処理フロー例

```typescript
// Edge Function: redeem-invite/index.ts
// 認証済みユーザーが招待コードを使って会話に参加する処理
Deno.serve(async (req) => {
  const { code } = await req.json();
  const authHeader = req.headers.get('Authorization');

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader! } } }
  );

  const { data: invite, error: inviteError } = await supabaseClient
    .from('invites')
    .select('*')
    .eq('code', code)
    .is('used_by', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (inviteError || !invite) {
    return new Response(JSON.stringify({ error: '招待コードが無効か、期限切れです' }), { status: 400 });
  }

  const { data: userData } = await supabaseClient.auth.getUser();
  const userId = userData.user?.id;

  // トランザクション相当の処理: 会話メンバー追加と招待コードの使用済みフラグ更新
  const { data: conversation } = await supabaseClient
    .from('conversations')
    .select('id')
    .eq('created_by', invite.created_by)
    .eq('type', 'direct')
    .maybeSingle();

  // (会話が存在しない場合の新規作成処理は省略)

  await supabaseClient
    .from('conversation_members')
    .insert({ conversation_id: conversation!.id, user_id: userId });

  await supabaseClient
    .from('invites')
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq('code', code);

  return new Response(JSON.stringify({ conversationId: conversation!.id }), { status: 200 });
});
```

**注記**: このサンプルはロジックの骨格を示すものであり、実装時にはエラーハンドリング・グループ会話への招待対応を追加する必要がある。これはPhase 7（実装）で詳細化する。

---

## 4. Realtimeチャンネル設計

| チャンネル | 購読条件 | 用途 |
|---|---|---|
| `conversation:{conversation_id}` | 自分がメンバーである会話 | 新規メッセージのリアルタイム受信 |
| `conversation:{conversation_id}:receipts` | 同上 | 既読状態の変更をリアルタイム反映 |

RealtimeもRLSの対象となるため、自分がメンバーでない会話のチャンネルを購読しようとしても、Supabase側で拒否される。これによりクライアントコードのミスがそのままセキュリティホールになることを防ぐ。

---

## 5. 認証・認可

- Supabase Authを使用し、メールアドレス + マジックリンク方式を採用する（パスワード管理の手間・パスワード漏洩リスクを避けるため）
- 発行されたJWTを全てのPostgREST/Edge Functions呼び出しに付与する
- Edge Functions内部では`auth.getUser()`でユーザーIDを取得し、RLSと同様の検証を再度行う（多層防御。Edge FunctionsはService Role Keyを使うことがあり、その場合RLSがバイパスされるため、関数内で明示的な認可チェックが必須になる）

---

## 6. エラーハンドリング方針

- クライアント・Edge Functions間のエラーレスポンスは統一形式とする

```typescript
interface ApiError {
  code: string;       // 例: 'INVITE_EXPIRED', 'UNAUTHORIZED'
  message: string;    // ユーザー向けメッセージ（日本語）
}
```

- 暗号化・復号に関するエラー（鍵の不整合等）はサーバーに送信せず、クライアント内で処理する。エラー内容にメッセージの中身が漏れないようにする

---

## 7. レート制限

- Supabase Authのサインアップ・マジックリンク送信には標準でレート制限がかかる
- Edge Functions（特に`create-invite`）には、乱用防止のため、同一ユーザーからの呼び出し回数を`invites`テーブルの件数で簡易的に制限する（例: 1時間あたり5回まで）。専用のレート制限ミドルウェアは、MVPの規模では過剰と判断し導入しない

---

## 8. Phase 4 まとめ

### 実施内容
- Supabase直接アクセスで完結する操作と、Edge Functionsが必要な操作を明確に分離した。
- 招待コード処理・Push通知送信・アカウント削除の3つをEdge Functionsとして設計した。
- Realtimeチャンネル設計、認証方式、エラーハンドリング、レート制限方針を定めた。

### 設計判断
- Edge FunctionsはService Role Keyを使うためRLSをバイパスしうる。この場合、関数内で明示的な認可チェックを行うことをルール化した。これを怠ると、Phase 3で組んだ多層防御が意味を失う。

### 残課題
- `redeem-invite`のグループ会話対応ロジックは骨格のみ示した。詳細はPhase 7（実装）で詰める。

### 次のPhase（Phase 5: UI/UX設計）で行うこと
- 画面遷移、ワイヤーフレーム、デザインシステムの設計を行う。プライバシー軸の差別化をUIでどう表現するかが焦点になる。
