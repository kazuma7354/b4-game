# Space Training Shooter - セットアップガイド

## ローカルサーバーの起動方法

`game.js` が ES module として読み込まれるため、`file://` ではなく `http://` で実行する必要があります。

### 方法 1: Python を使う (推奨)

**前提条件**: Python 3.x がインストールされていることを確認

```bash
# このフォルダで PowerShell またはコマンドプロンプトを開き
python -m http.server 8000

# または
python3 -m http.server 8000
```

その後、ブラウザで `http://localhost:8000/index.html` を開く

#### Python がない場合

1. https://www.python.org/downloads/ から Python をダウンロード
2. インストール時に **"Add Python to PATH"** にチェック
3. コマンドプロンプトを再起動して試す

### 方法 2: Node.js を使う

**前提条件**: Node.js がインストールされていることを確認

```bash
npx http-server -p 8000
```

その後、ブラウザで `http://localhost:8000/index.html` を開く

### 方法 3: バッチファイルを使う (Windows のみ)

このフォルダの以下のどちらかをダブルクリック

- `run-local-server.bat` （Python が必要）
- `run-local-server-node.bat` （Node.js が必要）

自動的にサーバーが起動し、ブラウザで開くように指示します。

### 方法 4: VS Code Live Server 拡張を使う

1. VS Code に `Live Server` 拡張をインストール
2. `index.html` を右クリック → "Open with Live Server"

---

## トラブルシューティング

### サーバーが起動しない

1. `python --version` または `node --version` で確認
2. Python または Node.js がない場合は各 URL からダウンロード

### ブラウザで `connection refused` エラー

- ポート 8000 が既に使用中の可能性があります
- コマンドで別のポートを指定:
  ```bash
  python -m http.server 9000
  ```
- その後 `http://localhost:9000/index.html` で開く

### Supabase の接続に失敗する

- `supabase.js` の `SUPABASE_ANON_KEY` が正しいか確認
- ブラウザのコンソール（F12）でエラーメッセージを確認

---

## Supabase テーブル設定

SQL Editor で以下を実行してテーブルと関数を作成してください：

```sql
-- テーブル作成
create table public.game_scores (
  id bigserial primary key,
  player_name text not null,
  level int not null check (level between 1 and 3),
  score int not null,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  meta jsonb default '{}'
);

-- インデックス作成
create index idx_game_scores_level_score on public.game_scores(level, score desc);
create index idx_game_scores_created_at on public.game_scores(created_at desc);

-- ランキング取得用 RPC 関数作成
create or replace function public.get_best_scores_by_level(p_level int)
returns table (
  player_name text,
  best_score int
)
language sql
as $$
  select player_name, max(score) as best_score
  from public.game_scores
  where level = p_level
  group by player_name
  order by best_score desc
  limit 8;
$$;

-- RLS 有効化
alter table public.game_scores enable row level security;

-- Insert ポリシー（だれでも挿入可能）
create policy "Allow insert" on public.game_scores
  for insert
  to anon
  with check (true);

-- Select ポリシー（だれでも読取可能）
create policy "Allow select" on public.game_scores
  for select
  to anon
  using (true);
```

---

## Supabase キーの確認

1. Supabase ダッシュボード → Settings → API
2. `anon public` キーをコピー
3. `supabase.js` の `SUPABASE_ANON_KEY` に貼り付け
