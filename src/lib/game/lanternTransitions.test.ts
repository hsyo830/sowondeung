import { describe, expect, it } from "vitest";

import type { GameMode, HeldLantern, LanternStatus, Stroke } from "@/types/game";

import {
  EMPTY_HELD_LANTERN,
  applyLanternAction,
  canOpenColorSelect,
  canOpenWriting,
} from "./lanternTransitions";
import type { LanternAction } from "./lanternTransitions";

const INK: readonly Stroke[] = [[{ x: 10, y: 20 }]];
const OTHER_INK: readonly Stroke[] = [
  [
    { x: 1, y: 1 },
    { x: 5, y: 5 },
  ],
];

function held(status: LanternStatus, strokes: readonly Stroke[] = []): HeldLantern {
  if (status === "NONE") return EMPTY_HELD_LANTERN;
  return { id: "lantern-1", colorId: "sky", strokes, status };
}

const ACTIONS: Record<LanternAction["type"], LanternAction> = {
  receive: { type: "receive", colorId: "yellow", newId: "lantern-2" },
  finishWriting: { type: "finishWriting", strokes: INK },
  light: { type: "light" },
  launch: { type: "launch" },
};

/** SPEC §7 전이 표 전체: [이전 상태, 액션, 결과 상태 | null(거부)] */
const TRANSITION_TABLE: [LanternStatus, LanternAction["type"], LanternStatus | null][] = [
  ["NONE", "receive", "BLANK"],
  ["NONE", "finishWriting", null],
  ["NONE", "light", null],
  ["NONE", "launch", null],
  ["BLANK", "receive", "BLANK"],
  ["BLANK", "finishWriting", "WRITTEN"],
  ["BLANK", "light", null],
  ["BLANK", "launch", null],
  ["WRITTEN", "receive", null],
  ["WRITTEN", "finishWriting", "WRITTEN"],
  ["WRITTEN", "light", "LIT"],
  ["WRITTEN", "launch", null],
  ["LIT", "receive", null],
  ["LIT", "finishWriting", null],
  ["LIT", "light", null],
  ["LIT", "launch", "NONE"],
];

describe("applyLanternAction — 전이 표", () => {
  it.each(TRANSITION_TABLE)("%s + %s → %s", (from, type, expected) => {
    const result = applyLanternAction(held(from, from === "NONE" ? [] : INK), ACTIONS[type]);
    expect(result?.status ?? null).toBe(expected);
  });

  it("입력 천등 객체를 바꾸지 않는다", () => {
    const before = held("BLANK");
    const snapshot = structuredClone(before);
    applyLanternAction(before, ACTIONS.finishWriting);
    applyLanternAction(before, ACTIONS.receive);
    expect(before).toEqual(snapshot);
  });
});

describe("receive (천등 받기 · 색상 다시 고르기)", () => {
  it("NONE에서 받으면 새 id·선택 색·빈 획의 BLANK 천등이 된다", () => {
    expect(applyLanternAction(EMPTY_HELD_LANTERN, ACTIONS.receive)).toEqual({
      id: "lantern-2",
      colorId: "yellow",
      strokes: [],
      status: "BLANK",
    });
  });

  it("BLANK에서 다시 받으면 새 천등이 아니라 같은 천등의 색만 바뀐다 (중복 수령 방지)", () => {
    const result = applyLanternAction(held("BLANK"), ACTIONS.receive);
    expect(result).toEqual({ id: "lantern-1", colorId: "yellow", strokes: [], status: "BLANK" });
  });

  it("WRITTEN에서는 색을 바꿀 수 없다 (SPEC §6 STEP 2)", () => {
    expect(applyLanternAction(held("WRITTEN", INK), ACTIONS.receive)).toBeNull();
  });
});

describe("finishWriting (작성 완료 · 수정 완료)", () => {
  it("빈 획 배열로는 완료할 수 없다", () => {
    expect(applyLanternAction(held("BLANK"), { type: "finishWriting", strokes: [] })).toBeNull();
    expect(applyLanternAction(held("BLANK"), { type: "finishWriting", strokes: [[]] })).toBeNull();
  });

  it("WRITTEN을 다시 완료하면 획이 새 내용으로 바뀌고 id·색은 유지된다", () => {
    const result = applyLanternAction(held("WRITTEN", INK), {
      type: "finishWriting",
      strokes: OTHER_INK,
    });
    expect(result).toEqual({
      id: "lantern-1",
      colorId: "sky",
      strokes: OTHER_INK,
      status: "WRITTEN",
    });
  });

  it("천등 없이(NONE) 작성 완료할 수 없다 (기획 §11 #1)", () => {
    expect(applyLanternAction(EMPTY_HELD_LANTERN, ACTIONS.finishWriting)).toBeNull();
  });
});

describe("모드 전환 가능 여부", () => {
  const STATUSES: LanternStatus[] = ["NONE", "BLANK", "WRITTEN", "LIT"];
  const MODES: GameMode[] = ["EXPLORE", "COLOR_SELECT", "WRITING"];

  it("색상 선택은 EXPLORE + NONE·BLANK에서만 열린다", () => {
    for (const mode of MODES) {
      for (const status of STATUSES) {
        const expected = mode === "EXPLORE" && (status === "NONE" || status === "BLANK");
        expect(canOpenColorSelect(status, mode), `${mode}/${status}`).toBe(expected);
      }
    }
  });

  it("작성 모드는 EXPLORE + BLANK·WRITTEN에서만 열린다", () => {
    for (const mode of MODES) {
      for (const status of STATUSES) {
        const expected = mode === "EXPLORE" && (status === "BLANK" || status === "WRITTEN");
        expect(canOpenWriting(status, mode), `${mode}/${status}`).toBe(expected);
      }
    }
  });
});
