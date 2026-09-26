export type SurveyId = "bad-01" | "bad-02";
export type Answer = string | string[] | null;
export type SurveyAnswers = Record<string, Answer>;
export type SurveyResponse = { version: 1; answers: SurveyAnswers };
export type Question = {
  id: string;
  label: string;
  kind: "multiple" | "single" | "score" | "text";
  options?: string[];
};

export const MAX_TEXT_LENGTH = 500;
export const surveys: Record<
  SurveyId,
  { button: string; thanks: string; questions: Question[] }
> = {
  "bad-01": {
    button: "メデューサを げんきづける！",
    thanks: "まぁ！教えてくれてありがとう！これで私も にっこり笑顔になれたわ！",
    questions: [
      {
        id: "visitor",
        label: "あなたについて 教えてくれる？",
        kind: "multiple",
        options: ["小学生", "親子", "iU関係者", "その他"],
      },
      {
        id: "discovery",
        label: "このお祭りを どこで知ったのかしら？",
        kind: "single",
        options: [
          "ポスター・チラシ",
          "がっこうのおしらせ",
          "おうちの人・お友達から聞いて",
          "Instagram",
        ],
      },
      {
        id: "satisfaction",
        label: "きょうのiUFesは どのくらいたのしかったかしら？",
        kind: "single",
        options: ["めっちゃたのしかった！", "たのしかった！", "ふつうかな"],
      },
      {
        id: "recommendation",
        label: "お友達にも「たのしいよ！」って おすすめしたいかしら？",
        kind: "score",
      },
    ],
  },
  "bad-02": {
    button: "ヴァンパイアに ほうこくする！",
    thanks: "ふむふむ！貴重な情報をサンキュウ！よし、ワタシと なかよし決定だ！",
    questions: [
      {
        id: "favorite",
        label: "一番「おもしろい！」って思った お店やあそびは何だった？",
        kind: "text",
      },
      {
        id: "improvement",
        label:
          "「もうちょっと こうなったら もっと楽しいのにな〜」って思うところはあったか？",
        kind: "text",
      },
      {
        id: "return",
        label: "つぎのiUFesも またあそびに来たいか？",
        kind: "single",
        options: ["ぜったい行きたい！", "行きたい！", "わからない"],
      },
      {
        id: "wish",
        label: "こんどは どんなお店やあそびがあったら うれしい？",
        kind: "text",
      },
      {
        id: "message",
        label: "最後に、ワタシやお祭りのみんなに メッセージをくれるか？",
        kind: "text",
      },
    ],
  },
};

export function isSurveyId(id: string): id is SurveyId {
  return id === "bad-01" || id === "bad-02";
}

/** Empty answers are intentional non-responses, never fabricated scores or text. */
export function validateAnswers(
  id: SurveyId,
  value: unknown,
): {
  answers: SurveyAnswers;
  errors: Record<string, string>;
} {
  const answers: SurveyAnswers = {};
  const errors: Record<string, string> = {};
  const input =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  if (!input) errors.form = "回答を確認して、もう一度お試しください。";
  for (const question of surveys[id].questions) {
    const answer = input?.[question.id];
    if (answer === undefined || answer === null || answer === "") {
      answers[question.id] = null;
    } else if (question.kind === "multiple") {
      if (
        Array.isArray(answer) &&
        answer.every(
          (item) =>
            typeof item === "string" && question.options?.includes(item),
        )
      ) {
        const choices = question.options!.filter((option) =>
          answer.includes(option),
        );
        answers[question.id] = choices.length ? choices : null;
      } else errors[question.id] = "選択肢から選んでください。";
    } else if (typeof answer !== "string") {
      errors[question.id] = "回答の形式を確認してください。";
    } else if (question.kind === "text") {
      const text = answer.trim();
      if (text.length > MAX_TEXT_LENGTH)
        errors[question.id] = `${MAX_TEXT_LENGTH}文字以内で入力してください。`;
      else answers[question.id] = text || null;
    } else if (
      question.kind === "score"
        ? /^(10|[0-9])$/.test(answer)
        : question.options?.includes(answer)
    ) {
      answers[question.id] = answer;
    } else errors[question.id] = "選択肢から選んでください。";
  }
  return { answers, errors };
}
