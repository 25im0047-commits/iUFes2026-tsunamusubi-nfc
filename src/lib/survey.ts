export type SurveyId = "bad-01" | "bad-02";
export type Answer = string | string[] | null;
export type SurveyAnswers = Record<string, Answer>;
export type SurveyResponse = { version: 2; answers: SurveyAnswers };
export type Choice = { id: string; label: string };
export type Question = {
  id: string;
  label: string;
  kind: "multiple" | "single" | "score" | "text";
  options?: Choice[];
};

export const MAX_TEXT_LENGTH = 500;
export const surveys: Record<
  SurveyId,
  { button: string; thanks: string; questions: Question[] }
> = {
  "bad-01": {
    button: "メデューサを げんきづける！",
    thanks: "まぁ！教えてくれて ありがとう！これで私も にっこり笑顔になれたわ！",
    questions: [
      {
        id: "visitor",
        label: "あなたに ついて 教えてくれる？",
        kind: "multiple",
        options: [
          { id: "elementary", label: "小学生" },
          { id: "family", label: "親子" },
          { id: "iu", label: "iU関係者" },
          { id: "other", label: "その他" },
        ],
      },
      {
        id: "discovery",
        label: "このお祭りを どこで 知ったのかしら？",
        kind: "single",
        options: [
          { id: "poster", label: "ポスター・チラシ" },
          { id: "school", label: "がっこうのおしらせ" },
          { id: "word-of-mouth", label: "おうちの人・お友達から聞いて" },
          { id: "instagram", label: "Instagram" },
        ],
      },
      {
        id: "satisfaction",
        label: "きょうの iUFesは どのくらい たのしかったかしら？",
        kind: "single",
        options: [
          { id: "very-happy", label: "めっちゃたのしかった！" },
          { id: "happy", label: "たのしかった！" },
          { id: "neutral", label: "ふつうかな" },
        ],
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
        label: "一番「おもしろい！」って思った お店やあそびは 何だった？",
        kind: "text",
      },
      {
        id: "improvement",
        label:
          "「もうちょっと こうなったら もっと楽しいのにな〜」って思うところは あったか？",
        kind: "text",
      },
      {
        id: "return",
        label: "つぎの iUFes も また あそびに来たいか？",
        kind: "single",
        options: [
          { id: "definitely", label: "ぜったい行きたい！" },
          { id: "yes", label: "行きたい！" },
          { id: "unsure", label: "わからない" },
        ],
      },
      {
        id: "wish",
        label: "こんどは どんな お店やあそびが あったら うれしい？",
        kind: "text",
      },
      {
        id: "message",
        label: "最後に、ワタシや お祭りのみんなに メッセージを くれるか？",
        kind: "text",
      },
    ],
  },
};

export function isSurveyId(id: string): id is SurveyId {
  return id === "bad-01" || id === "bad-02";
}

// Historical storage contracts: never edit these when changing display copy.
// A semantic question/option change requires a new response version and reader.
const responseQuestionsV2: Record<
  SurveyId,
  { id: string; kind: Question["kind"]; options?: string[] }[]
> = {
  "bad-01": [
    {
      id: "visitor",
      kind: "multiple",
      options: ["elementary", "family", "iu", "other"],
    },
    {
      id: "discovery",
      kind: "single",
      options: ["poster", "school", "word-of-mouth", "instagram"],
    },
    {
      id: "satisfaction",
      kind: "single",
      options: ["very-happy", "happy", "neutral"],
    },
    { id: "recommendation", kind: "score" },
  ],
  "bad-02": [
    { id: "favorite", kind: "text" },
    { id: "improvement", kind: "text" },
    { id: "return", kind: "single", options: ["definitely", "yes", "unsure"] },
    { id: "wish", kind: "text" },
    { id: "message", kind: "text" },
  ],
};

const legacyChoices: Record<string, Record<string, string>> = {
  visitor: {
    小学生: "elementary",
    親子: "family",
    iU関係者: "iu",
    その他: "other",
  },
  discovery: {
    "ポスター・チラシ": "poster",
    がっこうのおしらせ: "school",
    "おうちの人・お友達から聞いて": "word-of-mouth",
    Instagram: "instagram",
  },
  satisfaction: {
    "めっちゃたのしかった！": "very-happy",
    "たのしかった！": "happy",
    ふつうかな: "neutral",
  },
  return: {
    "ぜったい行きたい！": "definitely",
    "行きたい！": "yes",
    わからない: "unsure",
  },
};

export function readSurveyResponse(
  id: SurveyId,
  value: unknown,
): SurveyResponse | undefined {
  if (!value || typeof value !== "object") return;
  const response = value as { version?: unknown; answers?: unknown };
  if (response.version !== 1 && response.version !== 2) return;
  let input = response.answers;
  if (
    response.version === 1 &&
    input &&
    typeof input === "object" &&
    !Array.isArray(input)
  ) {
    const converted: Record<string, unknown> = { ...input };
    for (const question of responseQuestionsV2[id]) {
      const mapping = legacyChoices[question.id];
      const answer = converted[question.id];
      if (!mapping || answer === undefined || answer === null || answer === "")
        continue;
      const convert = (choice: unknown) =>
        typeof choice === "string" && Object.hasOwn(mapping, choice)
          ? mapping[choice]
          : undefined;
      if (Array.isArray(answer)) {
        const choices = answer.map(convert);
        if (choices.some((choice) => choice === undefined)) return;
        converted[question.id] = choices;
      } else {
        const choice = convert(answer);
        if (choice === undefined) return;
        converted[question.id] = choice;
      }
    }
    input = converted;
  }
  const checked = validateAnswers(id, input);
  if (Object.keys(checked.errors).length) return;
  return { version: 2, answers: checked.answers };
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
  for (const question of responseQuestionsV2[id]) {
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
