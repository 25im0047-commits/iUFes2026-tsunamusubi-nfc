import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validateAnswers,
  readSurveyResponse,
  surveys,
} from "../src/lib/survey.ts";

test("all questions may be unanswered without fabricating data", () => {
  for (const id of ["bad-01", "bad-02"]) {
    const result = validateAnswers(id, {});
    assert.deepEqual(result.errors, {});
    assert.ok(Object.values(result.answers).every((value) => value === null));
  }
});

test("zero and ten are valid explicit scores; missing score is not zero", () => {
  for (const value of ["0", "10"])
    assert.equal(
      validateAnswers("bad-01", { recommendation: value }).answers
        .recommendation,
      value,
    );
  assert.equal(validateAnswers("bad-01", {}).answers.recommendation, null);
  for (const value of ["-1", "11", "5.5", 5, [], {}])
    assert.ok(
      validateAnswers("bad-01", { recommendation: value }).errors
        .recommendation,
    );
});

test("multiple choice allows combined visitor categories and rejects unknown options", () => {
  assert.deepEqual(
    validateAnswers("bad-01", { visitor: ["family", "elementary", "family"] })
      .answers.visitor,
    ["elementary", "family"],
  );
  assert.equal(
    validateAnswers("bad-01", { visitor: [] }).answers.visitor,
    null,
  );
  assert.ok(validateAnswers("bad-01", { visitor: ["unknown"] }).errors.visitor);
  assert.ok(validateAnswers("bad-01", { visitor: "親子" }).errors.visitor);
  assert.ok(
    validateAnswers("bad-01", { discovery: "unknown" }).errors.discovery,
  );
});

test("free text is trimmed, optional, limited to 500 and preserved as plain text", () => {
  assert.equal(
    validateAnswers("bad-02", { favorite: "  工作  " }).answers.favorite,
    "工作",
  );
  assert.equal(
    validateAnswers("bad-02", { favorite: "  \n " }).answers.favorite,
    null,
  );
  assert.equal(
    validateAnswers("bad-02", { favorite: "あ".repeat(500) }).answers.favorite
      .length,
    500,
  );
  assert.ok(
    validateAnswers("bad-02", { favorite: "あ".repeat(501) }).errors.favorite,
  );
  assert.equal(
    validateAnswers("bad-02", { favorite: "<script>alert(1)</script>" }).answers
      .favorite,
    "<script>alert(1)</script>",
  );
});

test("unexpected form containers and wrong value types do not become completions", () => {
  for (const value of [null, "text", [], 42])
    assert.ok(validateAnswers("bad-02", value).errors.form);
  assert.ok(validateAnswers("bad-02", { favorite: ["text"] }).errors.favorite);
});

test("historical answers are read independently of current UI questions", () => {
  const questions = surveys["bad-01"].questions;
  surveys["bad-01"].questions = [];
  try {
    assert.equal(
      readSurveyResponse("bad-01", {
        version: 2,
        answers: { satisfaction: "happy" },
      }).answers.satisfaction,
      "happy",
    );
    assert.equal(
      readSurveyResponse("bad-01", {
        version: 1,
        answers: { satisfaction: "たのしかった！" },
      }).answers.satisfaction,
      "happy",
    );
    assert.equal(
      readSurveyResponse("bad-01", {
        version: 1,
        answers: { satisfaction: "happy" },
      }),
      undefined,
    );
    assert.equal(
      readSurveyResponse("bad-01", {
        version: 1,
        answers: { visitor: ["unknown"] },
      }),
      undefined,
    );
    assert.equal(
      readSurveyResponse("bad-01", { version: 99, answers: {} }),
      undefined,
    );
  } finally {
    surveys["bad-01"].questions = questions;
  }
});

test("current choice IDs match the versioned answer contract", () => {
  for (const [id, survey] of Object.entries(surveys)) {
    for (const question of survey.questions) {
      for (const option of question.options ?? []) {
        const value = question.kind === "multiple" ? [option.id] : option.id;
        assert.deepEqual(
          validateAnswers(id, { [question.id]: value }).errors,
          {},
        );
      }
    }
  }
});
