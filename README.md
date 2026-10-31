# こもれび日記

オリジナルの白ねこ「しろ」と暮らす、小さなブラウザ育成ゲーム。ことばを教えると会話に登場します。おしゃべり・なでる・おやつ・遊びで仲良し度が育ちます。げんきが減ったら遊ぶボタンでひと休みできます。

## 起動

Node.js 20 以上で、追加のインストールは不要です。

```sh
npm start
```

ポートは既定で 3000、`PORT` で変更できます。保存先はブラウザの localStorage です。同じブラウザ・同じオリジンで続きから遊べます。サーバーへのデータ送信、外部 API、外部アセットはありません。ブラウザのサイトデータを削除すると記録も消えます。音は初期設定で OFF です。

## ブラウザテスト

```sh
npm ci
npx playwright install chromium
npm test
```

テストは専用サーバー（ポート 3137）を起動・終了します。システムの `/usr/bin/chromium` があれば優先し、その他の場所は `CHROMIUM_PATH` で指定できます。ことば学習、重複入力、お世話、休憩、保存・復元、ダイアログのキーボード操作、モバイル幅を検証します。

## GitHub Pages で公開

静的ファイルだけで動作するため、公開先で Node.js サーバーは不要です。

1. リポジトリの **Settings → Pages → Build and deployment → Source** を **GitHub Actions** に設定します。
2. `main` への push で `Deploy game to GitHub Pages` が実行されます。初回設定後、必要なら **Actions** から同ワークフローの **Run workflow** を実行します。
3. デプロイ成功後の URL は `https://komiki0401.github.io/pet_game/` です。

`npm run build` は公開する `index.html`・`style.css`・`app.js` と `.nojekyll` だけを `dist/` に出力します。サーバーやテスト、node_modules は公開成果物に入りません。アセット参照は相対パスなので `/pet_game/` 配下でも動作します。Pages の URL とローカル起動では保存先が異なり、プレイ記録は共有されません。
