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

テストはNode標準のtest runnerで実行し、追加のテスト用依存はありません。Node 22で表示される型除去機能の実験的警告はテスト失敗ではありません。CIはWindows/LinuxとNode 22.12.0/24で同じチェックを実行します。

## コードの入口

| ファイル | 役割 |
| --- | --- |
| `src/lib/rally.ts` | 仮のおばけ一覧、進捗の検証・合成・達成判定・保存 |
| `src/lib/nfc.ts` | NFC URLのID読み取りとURL整理 |
| `src/routes/index.tsx` | Map、スタンプ一覧、会話、保存警告と再試行 |
| `src/styles.css` | 画面スタイル |
| `tests/*.test.mjs` | 保存障害・不正データ・重複取得・URLの回帰テスト |
| `.github/workflows/ci.yml` | PRとmainの検証 |

`src/routeTree.gen.ts`は自動生成ファイルです。ルートを変更していない場合、改行だけの差分をPRに含めないでください。

## ブラウザーでの確認

テスト専用のブラウザープロファイルかローカル開発環境を使ってください。以下の手順は進捗を書き換えるため、実参加者の端末では実行しません。

| 操作 | 期待結果 |
| --- | --- |
| 保存データなしで`/`を開く | 0/5、良いおばけだけを表示 |
| `/?id=good-01&source=test#map`を開く | 会話表示、URLは`/?source=test#map`になる |
| 会話を終え、再読み込みする | 1/5を維持。同じIDで再度開いても増えない |
| `/?id=unknown`を開く | 未登録の案内を表示し、進捗は増えない |
| 開発者ツールで保存値を壊したJSONにして再読み込み | 画面が開き、保存データの警告と再試行ボタンを表示 |
| 重複・未知IDを混ぜたJSONを保存して再読み込み | 有効なIDだけを表示。件数だけで解放されない |
| 下の手順で書き込みを失敗させて取得する | 画面には反映、保存警告が残る。保存成功とは表示しない |
| 書き込みを復旧して「進捗の保存を再試行」 | 警告が消え、再読み込み後も進捗が残る |
| 古い進捗を持つタブから別IDを取得する | 先に保存済みのIDと合成される。同時書き込みの保証は対象外 |

保存キーは`iufes2026-system-prototype-progress`です。例えばコンソールで次を実行し、再読み込みすると不正データからの復元を確認できます。

```js
localStorage.setItem("iufes2026-system-prototype-progress", JSON.stringify({
  goodStampIds: ["good-01", "good-01", "unknown", "bad-01"],
  badVisitedIds: [],
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

## 仕様変更時

[実装状況](docs/implementation-status.md)とSlack SSOTを照合し、確定済み要件と提案を分けてPRに記載してください。ID・取得条件・保存形式を変えるときは既存進捗の扱いを説明します。アンケート回答の完了に`badVisitedIds`をそのまま流用せず、送信と完了条件を定義してから変更してください。

PRには問題と変更後の動作、実行したチェック、残る制約を記載します。大学アカウントの認証情報や参加者データをテスト・スクリーンショットに含めないでください。
