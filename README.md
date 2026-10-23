# エアコンクリーニングさわやか 予約フォーム

エアコンクリーニングの予約フォームです。台数とオプションを選ぶと概算金額が表示され、
送信された予約は Google スプレッドシートに記録され、メールで通知されます。

## ファイル
- `index.html` … 予約フォーム本体（GitHub Pages で公開するページ）
- `gas/Code.gs` … 予約を受け取る Google Apps Script
- `gas/設定手順.md` … 受け取りの設定手順

## 料金・設定の変更
`index.html` の `<script>` 先頭にある `CONFIG`（店名・送信先URL・エリア・時間帯など）と
`ITEMS`（メニューと料金）を書き換えます。

## 公開（GitHub Pages）
リポジトリの Settings → Pages → Branch を `main` / `(root)` にして Save。
数分後に `https://ユーザー名.github.io/リポジトリ名/` で公開されます。
