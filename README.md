# iUFes2026 システムプロトタイプ

iU FesのNFCスタンプラリーを動作確認するTanStack Startプロトタイプです。本リポジトリはiU Fesの周遊企画を扱います。他の企画・公式サイトはそれぞれ別リポジトリで管理します。

会場図、出店名、良いおばけの文面・5体の構成、設置場所は仮データです。画面は本番デザインではありません。アンケートは端末内保存まで実装済みですが、運営への送信・自動集計は未実装です。本番運用できる状態ではありません。

## コントリビューター向け入口

- [実装状況・確定事項・残作業](docs/implementation-status.md)：次の実装範囲を確認する
- [参加者フローと回答仕様](docs/participant-flow.md)：今回確定した仕様・回答の扱い・将来のクイズ設計
- [開発・テスト・レビュー手順](CONTRIBUTING.md)：起動、保存エラーの再現、変更前の確認
- [変更履歴](CHANGELOG.md)：修正内容と検証結果
- [Slack SSOT](https://iu-people.slack.com/docs/T0100UQSVME/F0C4QA5M1NV)：企画上の決定と未決事項の原本

このREADMEと実装状況表はコードの説明です。2026-09-26に依頼者が確認した利用フローを反映しています。旧Slack SSOTの受付クイズ等と食い違う点は[参加者フロー](docs/participant-flow.md)に記録しています。SlackやDriveの資料には大学・プロジェクトのアカウントが必要な場合があります。

## 実装フロー

1. パンフレットのQRからWebページへアクセスし、タイトルを表示
2. あそびかたを読んでMapへ進む（開始済みの場合はMap、全取得済みの場合は完了画面へ）
3. NFCタグに書かれたURL（例：`https://example.com/?id=good-01`）をスマートフォンの標準機能で開く
4. URLの`id`でおばけを特定し、処理後に`id`だけを削除（他のクエリとハッシュは保持）
5. 良いおばけとの会話終了でスタンプを`localStorage`へ保存
6. 良いおばけをすべて集めると、暗転・2つの影の演出を経てMapに悪いおばけを表示
7. メデューサ（4問）・ヴァンパイア（5問）を順不同で訪問。回答は全問任意で、会話終了ボタンでスタンプを取得
8. 全取得でエンディングを表示し、受付に画面を見せてプレゼントを受け取る。今回はクイズなし
9. 取得済みカードでは会話を再表示できる。回答の上書き・スタンプの二重取得は行わない

悪いおばけは、良いおばけ全取得前には直接URLでも開けません。解放前はMapで案内し、解放後に現地で再タッチします。URLを開いただけ、会話を途中で閉じただけでは取得しません。

進捗と完了した回答は、同じブラウザー・同じオリジンの`localStorage`へ保存します。読み込み時に不正データを除去し、全対象IDの取得を達成条件とします。保存失敗時は警告と再試行ボタンを表示し、画面内の進捗・回答を保持します。端末間同期・不正防止・運営向け集計は提供していません。旧形式からは良いおばけのスタンプのみ引き継ぎ、旧「悪いおばけ訪問済み」は会話完了に変換しません。

## 本番画像への差し替え

おばけ画像はデータの `imageSrc` を指定するだけで差し替えられる構造です。例えば `public/ghosts/good-01.webp` を追加し、`src/lib/rally.ts` の対象データに `imageSrc: '/ghosts/good-01.webp'` を設定してください。未設定時は仮のおばけプレースホルダーが表示されます。

## 起動

```bash
npm ci
npm run dev
```

Node.js 22.12.0以上を使用してください。起動先は`http://localhost:3001`です。例：`http://localhost:3001/?id=good-01`。実機のNFC確認には、端末からアクセスできるHTTPS環境を用意します。

```bash
npm run typecheck
npm test
npm run build
```

PRとmainへのpushでは、GitHub ActionsでWindows/Linux、Node.js 22.12.0/24のチェックと、Linux / Node 24のChromiumブラウザーテストを実行します。ブラウザーテストの起動方法は[開発手順](CONTRIBUTING.md)を参照してください。各PRのChecksで結果を確認してください。

## Vercelへの公開

このアプリはTanStack StartのSSRを使用します。`vite.config.ts`のNitroプラグインが、Vercelで実行するサーバー関数と静的ファイルを生成します。`vercel.json`でフレームワークを`tanstack-start`に指定しています。

1. VercelでこのGitリポジトリをImportします。Root Directoryはリポジトリ直下（`package.json`がある場所）です。
2. Framework Presetが **TanStack Start** であることを確認します。Build Command / Output Directoryの独自のOverrideは解除し、フレームワークの既定値を使ってください。Node.jsはCIでも検証する **24.x** を推奨します。
3. デプロイすると、Vercelが割り当てる`https://<project-name>.vercel.app`で公開できます。独自ドメインの購入・DNS設定は不要です。現状のアプリに必須の環境変数はありません。
4. 公開URLの`/`でタイトルが表示され、`/?id=good-01`で会話が開くことを確認します。NFCタグにはProductionに割り当てた同じドメインのURLを書き込みます。進捗はオリジン単位なので、Preview URLとは共有されません。

すでに404が発生しているプロジェクトは、この修正をコミット・pushし、修正を含むコミットから再デプロイしてください。古いコミットのRedeployだけでは修正が入りません。

`dist`や`dist/client`を静的サイトとして配信しても、このSSRアプリのトップページは生成されません。Vercel用ビルドでは`.vercel/output/config.json`と`functions`・`static`が生成されます。`/index.html`へのSPA用rewriteは不要です。HTMLの生成元は`src/routes/__root.tsx`であり、リポジトリ直下に別の`index.html`を置くとNitroが空のHTMLを配信する原因になります。

設定の根拠：[Vercel公式のTanStack Startデプロイ手順](https://vercel.com/kb/guide/deploy-a-tanstack-start-app-to-vercel)。ローカルでの本番ビルド・配信確認は[開発手順](CONTRIBUTING.md)を参照してください。

