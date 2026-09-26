# 開発・レビュー手順

## 起動と自動チェック

Node.js 22.12.0以上を使用します。依存関係は`package-lock.json`に固定されているため、共同作業では`npm ci`を使います。

```bash
npm ci
npm run dev
```

`http://localhost:3001`を開きます。PRを作成する前に次を実行してください。

```bash
npm run typecheck
npm test
npm run build
```

単体テストはNode標準のtest runnerで実行します。Node 22で表示される型除去機能の実験的警告はテスト失敗ではありません。CIはWindows/LinuxとNode 22.12.0/24で同じチェックを実行します。

表示や参加者フローを変更した場合は、Playwrightのブラウザーテストも実行してください。初回のみChromiumとWebKitをインストールします。

```bash
npx playwright install chromium webkit
npm run test:e2e
```

テストはChromiumとモバイル・タッチ設定のWebKitで各15件（計30件）を実行します。[モバイル検証記録](docs/mobile-verification.md)に画面サイズと実機で残る確認をまとめています。スクリーンショットは`test-results/`に出力され、次の実行時に置き換わります。

テストは専用のブラウザー環境を使い、開発サーバーを`http://127.0.0.1:3002`で起動します。モーダルの中央配置・スクロール・画面サイズ変更・フォーカス復帰と、NFCから全取得までのフロー・保存失敗からの再試行を確認します。

### 本番ビルド・Vercel向け出力の検証

デプロイ設定を変更した場合は、本番ビルドを実際に配信するブラウザーテストも実行します。ビルドとサーバーの起動・終了はテストが行います。開発サーバーの流用はせず、ポート3002が使用中ならエラーになります。

```bash
npm run test:e2e:production
```

CIではLinux / Node 24でこの本番ブラウザーテストを実行し、失敗時のトレースをArtifactsに7日間保存します。手動で本番ビルドを起動する場合は`npm run build`の後に`npm start`を実行します（既定は`http://localhost:3000`）。

Vercel用ビルドのサーバー関数と配信ファイルは、次の手順で検証します。Vercelアカウントや認証情報は不要です。

```bash
NITRO_PRESET=vercel npm run build
npm run test:deployment
```

PowerShellの場合：

```powershell
$env:NITRO_PRESET = 'vercel'
npm run build
Remove-Item Env:NITRO_PRESET
npm run test:deployment
```

このテストは`.vercel/output`内のルーティング先の関数を実行し、`/`とNFCクエリ付きURLがHTMLを返すこと、読み込むJavaScript/CSSが出力されていること、未知のパスがアプリの404になることを確認します。CIのWindows/Linux・Node 22.12.0/24でも実行します。Vercel上のプロジェクト設定・ドメイン割り当ては再現しないため、再デプロイ後には公開URLも確認してください。

## コードの入口

| ファイル | 役割 |
| --- | --- |
| `src/lib/rally.ts` | 仮のおばけ一覧、進捗の検証・合成・達成判定・保存 |
| `src/lib/survey.ts` | 質問・選択肢・任意回答と文字数の検証 |
| `src/lib/nfc.ts` | NFC URLのID読み取りとURL整理 |
| `src/routes/index.tsx` | タイトルから受付提示までの画面遷移、進捗更新、保存警告 |
| `src/components/GhostDialog.tsx` | 会話、アンケート、ネイティブdialogによるフォーカス管理 |
| `src/styles.css` | 画面スタイル |
| `tests/*.test.mjs` | 保存障害・不正データ・重複取得・URLの回帰テスト |
| `tests/browser/rally.spec.ts` | モーダルの表示・キーボード操作・参加者フローのブラウザーテスト |
| `tests/browser/responsive.spec.ts` | 7サイズの画面遷移・はみ出し・画像サイズ・小画面入力の検証 |
| `.github/workflows/ci.yml` | PRとmainの検証 |

`src/routeTree.gen.ts`は自動生成ファイルです。ルートを変更していない場合、改行だけの差分をPRに含めないでください。

## ブラウザーでの確認

テスト専用のブラウザープロファイルかローカル開発環境を使ってください。以下の手順は進捗を書き換えるため、実参加者の端末では実行しません。

| 操作 | 期待結果 |
| --- | --- |
| 保存データなしで`/`を開く | タイトル→あそびかた→Map。開始後は再訪でMap |
| `/?id=good-01&source=test#map`を開く | 会話表示、URLは`/?source=test#map`になる |
| 会話を終え、再読み込みする | 1/5を維持。同じIDで再度開いても増えない |
| `/?id=unknown`を開く | 未登録の案内を表示し、進捗は増えない |
| 開発者ツールで保存値を壊したJSONにして再読み込み | 画面が開き、保存データの警告と再試行ボタンを表示 |
| 重複・未知IDを混ぜたJSONを保存して再読み込み | 有効なIDだけを表示。件数だけで解放されない |
| 下の手順で書き込みを失敗させて取得する | 画面には反映、保存警告が残る。保存成功とは表示しない |
| 書き込みを復旧して「進捗の保存を再試行」 | 警告が消え、再読み込み後も進捗が残る |
| 古い進捗を持つタブから別IDを取得する | 先に保存済みのIDと合成される。同時書き込みの保証は対象外 |
| 全良いおばけ取得前に`/?id=bad-01`・`bad-02`を開く | 会話・回答フォームを開かず、先に良いおばけを集める案内 |
| 最後の良いおばけの会話を終了 | 取得カード→暗転・2つの影→Mapへの導線 |
| 解放後に両方の訪問順で会話を終える | どちらの順でも完了可能。途中で閉じる／Escapeでは取得しない |
| メデューサのQ1を複数選択、Q4を0点にする | 複数項目と0点を保持。初期状態ではスコア未選択 |
| 全問未回答で悪いおばけの会話を終える | スタンプ取得、回答は`null`。勝手に0点等に変換しない |
| 自由記述を入力し、保存を失敗させて会話終了 | 警告と再試行。復旧後に回答と取得を保存できる |
| 全員の会話を終了し、再読み込み | エンディング。受付提示へ進める。クイズや受領済み判定は表示しない |
| 取得済みのおばけを再訪 | 会話の再閲覧のみ。回答フォームは出ず、記録を上書きしない |
| 図鑑をスクロールして会話を開き、閉じる／Escape | 会話は画面中央に表示。閉じると元のカードにフォーカスが戻り、ページ先頭へ飛ばない |
| 長いアンケートを開き、狭い縦画面・横画面に変更 | ダイアログが画面内に収まり、内部をスクロールして完了ボタンへ到達できる |

保存キーは`iufes2026-system-prototype-progress`です。例えばコンソールで次を実行し、再読み込みすると不正データからの復元を確認できます。

```js
localStorage.setItem("iufes2026-system-prototype-progress", JSON.stringify({
  schemaVersion: 2,
  hasStarted: true,
  goodStampIds: ["good-01", "good-01", "unknown", "bad-01"],
  surveyResponses: {},
}));
location.reload();
```

書き込み失敗は未取得のおばけのURLを開いてから、会話を終える前にコンソールで次を実行します。

```js
window.rallyOriginalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function () {
  throw new DOMException("Test storage failure", "QuotaExceededError");
};
```

会話を終えて警告を確認したら、再読み込みする前に復旧し、画面の再試行ボタンを押します。

```js
Storage.prototype.setItem = window.rallyOriginalSetItem;
delete window.rallyOriginalSetItem;
```

この操作はそのページ内だけのテスト用差し替えです。localStorage自体のアクセス拒否・読み込み失敗は単体テストでも確認します。

旧データの移行テストでは、`schemaVersion`なしの`{goodStampIds: [...], badVisitedIds: ["bad-01", "bad-02"]}`を入れて再読み込みします。良いおばけだけを引き継ぎ、悪いおばけは会話を再度終えるまで未取得であることを確認してください。

## 仕様変更時

[参加者フロー](docs/participant-flow.md)と[実装状況](docs/implementation-status.md)を入口にしてください。依頼者の最新確認を旧Slack SSOTより優先し、確定済み要件と検討中の提案を分けてPRに記載します。ID・取得条件・保存形式を変えるときは既存進捗の扱いを説明してください。現時点は端末内保存のみです。運営への送信を追加するときは会話完了と配送状態を分け、既存回答を自動送信しない移行を設計します。

PRには問題と変更後の動作、実行したチェック、残る制約を記載します。大学アカウントの認証情報や参加者データをテスト・スクリーンショットに含めないでください。
