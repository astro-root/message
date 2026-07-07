# Phase 6: ディレクトリ構成・開発環境構築

**フェーズステータス**: 提案（ユーザー承認待ち）
**前提**: Phase 2（アーキテクチャ）・Phase 3（DB）・Phase 4（API）・Phase 5（UI/UX）の内容を、実際のファイル配置に落とし込む

---

## 1. ディレクトリ構成

    message/
    ├── apps/
    │   └── web/                        # Next.js（フロントエンド + Server Actions）
    │       ├── app/                    # App Router（ルーティング）
    │       ├── features/               # Feature First構成（Phase 2）
    │       │   ├── auth/
    │       │   │   ├── domain/         # ビジネスルール（フレームワーク非依存）
    │       │   │   ├── application/    # ユースケース
    │       │   │   ├── infrastructure/ # Supabase実装
    │       │   │   └── presentation/   # Reactコンポーネント
    │       │   ├── messaging/
    │       │   ├── crypto/             # E2EE（libsodium）
    │       │   ├── notification/
    │       │   └── profile/
    │       ├── shared/                 # feature横断の共通コンポーネント・型
    │       ├── public/
    │       └── package.json
    ├── supabase/
    │   ├── migrations/                 # Phase 3のDDLをマイグレーションファイル化
    │   └── functions/                  # Phase 4のEdge Functions
    │       ├── create-invite/
    │       ├── redeem-invite/
    │       ├── send-push-notification/
    │       └── delete-account/
    ├── docs/                           # Phase 0〜6の設計ドキュメント一式
    ├── .github/
    │   └── workflows/
    │       ├── ci.yml                  # Lint・型チェック・テスト
    │       └── keep-supabase-alive.yml # Supabase無料枠の7日間停止対策（Phase 2の残課題）
    ├── pnpm-workspace.yaml
    ├── turbo.json
    ├── package.json
    └── tsconfig.base.json

**設計判断**: Phase 2で決めたfeature単位の4層構造（domain/application/infrastructure/presentation）を、そのままディレクトリ名に反映する。

---

## 2. 開発環境

- Node.js 24
- pnpm 10系
- Next.js 16系
- Supabase CLI（`pnpm dlx supabase`経由）

---

## 3. CI/CDの役割

- `ci.yml`: プッシュ・プルリクエストごとにLint・型チェック・テストを自動実行する
- `keep-supabase-alive.yml`: Supabase無料枠の7日間非アクティブ停止を回避する

---

## 4. Phase 6 まとめ

### 実施内容
- Feature First構成をそのまま反映したディレクトリ構成を確定した。
- 開発環境の組み合わせに問題がないことを確認した。

### 次のPhase（Phase 7: 実装）で行うこと
- 本ディレクトリ構成をもとに実装に着手する。
