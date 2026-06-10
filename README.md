# Space Training Shooter

Web ブラウザで動作する縦スクロールシューティングゲーム。3つのレベルでスキルアップしよう！

## 🎮 ゲーム情報

- **レベル 1**: コイン集め - 移動と基本射撃を学ぶ
- **レベル 2**: 敵撃破 - 強敵に対応して回避と連射を磨く
- **レベル 3**: ボス戦 - 複雑な攻撃パターンを読み切ろう

## 📋 必要なもの

- Web ブラウザ（Chrome、Firefox、Safari など）
- Python 3.x または Node.js（ローカル実行の場合）

## 🚀 実行方法

### 方法 1: Python で実行（推奨）

```bash
cd public
python -m http.server 8000

# または Python 3
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開く

### 方法 2: Node.js で実行

```bash
npx http-server public -p 8000
```

ブラウザで `http://localhost:8000` を開く

### 方法 3: VS Code Live Server

1. Live Server 拡張をインストール
2. `public/index.html` を右クリック → Open with Live Server

## 📁 ファイル構成

```
public/
  ├── index.html              # ホームページ
  ├── supabaseClient.js       # Supabase API クライアント
  ├── css/
  │   └── style.css           # スタイルシート
  ├── js/
  │   └── game.js             # ゲーム本体
  └── pages/
      └── game.html           # ゲームページ
package.json
.gitignore
README.md
```

## 🎮 操作方法

- **矢印キー** または **WASD**: 移動
- **Z キー**: 射撃
- **Enter キー**: タイトル画面からプレイ開始

## 🎯 スコアシステム

### レベル 1: コイン集め

- コイン 1 個 = 10 点

### レベル 2: 敵撃破

- 弱敵撃破 = 10 点
- 強敵撃破 = 25 点

### レベル 3: ボス戦

- ボス撃破: 2000 点 - (撃破時間 × 30)
- 例: 30 秒で撃破 = 2000 - 900 = 1100 点

## 🌐 Supabase ランキング連携

### セットアップ手順

1. **Supabase プロジェクト作成**
   - https://supabase.com にアクセス
   - 新しいプロジェクトを作成

2. **テーブル作成**
   - SQL Editor で以下を実行:

```sql
create table public.game_scores (
  id bigserial primary key,
  player_name text not null,
  level int not null check (level between 1 and 3),
  score int not null,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  meta jsonb default '{}'
);

create index idx_game_scores_level_score on public.game_scores(level, score desc);
```

3. **RPC 関数作成**

```sql
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
```

4. **RLS 設定**

```sql
alter table public.game_scores enable row level security;

create policy "Allow insert" on public.game_scores
  for insert to anon with check (true);

create policy "Allow select" on public.game_scores
  for select to anon using (true);
```

5. **API キー設定**
   - Settings → API から `anon public` キーをコピー
   - `public/supabaseClient.js` の `SUPABASE_ANON_KEY` に貼り付け

## 🎨 カスタマイズ

### 画像の追加

以下のファイルを `public/` フォルダに配置:

- `player.png` - プレイヤー
- `enemy1.png`, `enemy2.png`, `enemy3.png`, `enemy4.png` - 敵
- `boss.png` - ボス
- `coin.png` - コイン
- `bullet.png` - プレイヤー弾
- `enemy_bullet.png` - 敵弾

### 効果音の追加

以下のファイルを `public/` フォルダに配置:

- `shoot.mp3` - 射撃音
- `destroy.mp3` - 敵破壊音
- `hit.mp3` - ダメージ音
- `coin.mp3` - コイン取得音

## 🚢 デプロイ

### Vercel にデプロイ（推奨）

1. GitHub にプッシュ
2. https://vercel.com にサインイン
3. 新しいプロジェクトをインポート
4. Root Directory を `public` に設定
5. デプロイ

### GitHub Pages にデプロイ

1. `public` フォルダをリポジトリのルートにコピー
2. Settings → Pages で `public` を選択
3. デプロイ完了

### その他のホスティング

- Netlify
- Firebase Hosting
- AWS S3
- Google Cloud Storage

## 🐛 トラブルシューティング

### サーバーが起動しない

```bash
# Python がない場合
python --version  # または python3 --version

# インストール: https://www.python.org/downloads/
```

### Supabase に接続できない

- ブラウザの Developer Tools (F12) で Console タブを確認
- `supabaseClient.js` の URL とキーが正しいか確認
- RLS ポリシーが有効になっているか確認

### 画像が表示されない

- ファイル名が正確に一致しているか確認
- ファイルが `public/` フォルダにあるか確認
- ブラウザのキャッシュをクリア（Ctrl+Shift+Delete）

## 📄 ライセンス

MIT License

## 👤 作成者

Uemura Reiji
