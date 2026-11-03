import { describe, expect, it } from "vitest";

import type { Stroke } from "@/types/game";

import { appendPoint, clearStrokes, hasInk, startStroke, undoStroke } from "./strokes";

const A = { x: 1, y: 1 };
const B = { x: 2, y: 2 };
const C = { x: 3, y: 3 };

/** 원본 불변 검사용: 깊게 얼려서 수정 시 예외가 나게 한다 */
function freeze(strokes: Stroke[]): readonly Stroke[] {
  strokes.forEach((s) => Object.freeze(s));
  return Object.freeze(strokes);
}

describe("startStroke", () => {
  it("점 하나짜리 새 획을 끝에 추가한다", () => {
    expect(startStroke([], A)).toEqual([[A]]);
    expect(startStroke([[A, B]], C)).toEqual([[A, B], [C]]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const original = freeze([[A]]);
    const next = startStroke(original, B);
    expect(next).not.toBe(original);
    expect(original).toEqual([[A]]);
  });
});

describe("appendPoint", () => {
  it("마지막 획에만 점을 추가한다", () => {
    expect(appendPoint([[A], [B]], C)).toEqual([[A], [B, C]]);
  });

  it("원본 배열과 원본 획을 바꾸지 않고, 바뀌지 않은 획은 같은 참조를 유지한다", () => {
    const original = freeze([[A], [B]]);
    const next = appendPoint(original, C);
    expect(original).toEqual([[A], [B]]);
    expect(next[1]).not.toBe(original[1]);
    expect(next[0]).toBe(original[0]);
  });

  it("진행 중인 획이 없으면 내용을 바꾸지 않는다", () => {
    const original = freeze([]);
    const next = appendPoint(original, A);
    expect(next).toEqual([]);
    expect(next).not.toBe(original);
  });
});

describe("undoStroke", () => {
  it("마지막 획을 제거한다", () => {
    expect(undoStroke([[A], [B, C]])).toEqual([[A]]);
  });

  it("빈 배열에서는 빈 배열을 반환한다", () => {
    expect(undoStroke([])).toEqual([]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const original = freeze([[A], [B]]);
    undoStroke(original);
    expect(original).toEqual([[A], [B]]);
  });
});

describe("clearStrokes", () => {
  it("빈 배열을 반환한다", () => {
    expect(clearStrokes()).toEqual([]);
  });
});

describe("hasInk", () => {
  it("획이 없으면 false", () => {
    expect(hasInk([])).toBe(false);
  });

  it("빈 획만 있으면 false", () => {
    expect(hasInk([[], []])).toBe(false);
  });

  it("점이 하나라도 있으면 true (점 하나짜리 획 = 점 찍기)", () => {
    expect(hasInk([[], [A]])).toBe(true);
  });

  it("추가 → 되돌리기로 0획이 되면 false로 돌아온다", () => {
    const drawn = startStroke([], A);
    expect(hasInk(drawn)).toBe(true);
    expect(hasInk(undoStroke(drawn))).toBe(false);
  });
});
