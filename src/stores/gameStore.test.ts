import { beforeEach, describe, expect, it } from "vitest";

import { EMPTY_HELD_LANTERN } from "@/lib/game/lanternTransitions";
import type { Stroke } from "@/types/game";

import { useGameStore } from "./gameStore";

// store 액션이 전이 함수와 모드 규칙을 올바르게 연결하는지 확인한다 (전이 규칙 자체는 lanternTransitions.test.ts).
const INK: readonly Stroke[] = [[{ x: 100, y: 100 }]];
const EDITED_INK: readonly Stroke[] = [
  [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
  ],
];

const store = () => useGameStore.getState();

beforeEach(() => {
  useGameStore.setState({ held: EMPTY_HELD_LANTERN, mode: "EXPLORE", nearbyInteractionId: null });
});

describe("천등 받기 (NONE → BLANK)", () => {
  it("색상 선택을 열고 고르면 BLANK + 선택 색, 탐색 모드로 돌아온다", () => {
    expect(store().openColorSelect()).toBe(true);
    expect(store().mode).toBe("COLOR_SELECT");
    expect(store().receiveLantern("yellow")).toBe(true);
    expect(store().held).toMatchObject({ status: "BLANK", colorId: "yellow", strokes: [] });
    expect(store().mode).toBe("EXPLORE");
  });

  it("취소하면 NONE 그대로다", () => {
    store().openColorSelect();
    store().closeOverlay();
    expect(store().held).toBe(EMPTY_HELD_LANTERN);
    expect(store().mode).toBe("EXPLORE");
  });

  it("색상 선택 UI 없이(EXPLORE) 받을 수 없다 — UI 우회 차단", () => {
    expect(store().receiveLantern("red")).toBe(false);
    expect(store().held.status).toBe("NONE");
  });

  it("색상 버튼을 연달아 눌러도 한 번만 받는다 (중복 수령 방지)", () => {
    store().openColorSelect();
    expect(store().receiveLantern("red")).toBe(true);
    const first = store().held;
    expect(store().receiveLantern("pink")).toBe(false);
    expect(store().held).toBe(first);
  });

  it("BLANK에서 색을 다시 고르면 같은 천등(id 유지)의 색만 바뀐다", () => {
    store().openColorSelect();
    store().receiveLantern("red");
    const id = store().held.id;
    expect(store().runInteractionAction("reselectColor")).toBe(true);
    expect(store().receiveLantern("orange")).toBe(true);
    expect(store().held).toMatchObject({ id, colorId: "orange", status: "BLANK" });
  });

  it("다시 고르기를 취소하면 기존 색을 유지한다", () => {
    store().openColorSelect();
    store().receiveLantern("red");
    store().openColorSelect();
    store().closeOverlay();
    expect(store().held.colorId).toBe("red");
  });
});

describe("소원 작성 (BLANK → WRITTEN) · 수정", () => {
  beforeEach(() => {
    store().openColorSelect();
    store().receiveLantern("pink");
  });

  it("작성 모드에서 완료하면 WRITTEN + 획 저장 + 탐색 모드", () => {
    expect(store().openWriting()).toBe(true);
    expect(store().mode).toBe("WRITING");
    expect(store().finishWriting(INK)).toBe(true);
    expect(store().held).toMatchObject({ status: "WRITTEN", strokes: INK, colorId: "pink" });
    expect(store().mode).toBe("EXPLORE");
  });

  it("빈 종이는 완료할 수 없고 작성 모드에 남는다", () => {
    store().openWriting();
    expect(store().finishWriting([])).toBe(false);
    expect(store().held.status).toBe("BLANK");
    expect(store().mode).toBe("WRITING");
  });

  it("BLANK에서 작성을 취소하면 BLANK 그대로다", () => {
    store().openWriting();
    store().closeOverlay();
    expect(store().held).toMatchObject({ status: "BLANK", strokes: [] });
  });

  it("작성 모드가 아니면 완료할 수 없다 — UI 우회 차단", () => {
    expect(store().finishWriting(INK)).toBe(false);
    expect(store().held.status).toBe("BLANK");
  });

  it("WRITTEN 수정: 취소하면 기존 획 유지, 완료하면 새 획으로 교체", () => {
    store().openWriting();
    store().finishWriting(INK);

    expect(store().runInteractionAction("editWish")).toBe(true);
    store().closeOverlay();
    expect(store().held.strokes).toBe(INK);

    store().openWriting();
    expect(store().finishWriting(EDITED_INK)).toBe(true);
    expect(store().held).toMatchObject({ status: "WRITTEN", strokes: EDITED_INK });
  });

  it("WRITTEN에서는 색상 선택을 열 수 없다", () => {
    store().openWriting();
    store().finishWriting(INK);
    expect(store().openColorSelect()).toBe(false);
    expect(store().runInteractionAction("reselectColor")).toBe(false);
    expect(store().mode).toBe("EXPLORE");
  });
});

describe("모드 잠금", () => {
  it("천등 없이(NONE) 작성 모드에 들어갈 수 없다 (기획 §11 #1)", () => {
    expect(store().openWriting()).toBe(false);
    expect(store().runInteractionAction("writeWish")).toBe(false);
    expect(store().mode).toBe("EXPLORE");
  });

  it("다른 UI가 열려 있으면 새 UI를 열 수 없다", () => {
    store().openColorSelect();
    expect(store().openWriting()).toBe(false);
    expect(store().openColorSelect()).toBe(false);
    expect(store().mode).toBe("COLOR_SELECT");
  });

  it("nearbyInteractionId는 값이 바뀔 때만 갱신된다", () => {
    let updates = 0;
    const unsubscribe = useGameStore.subscribe(() => {
      updates += 1;
    });
    store().setNearbyInteraction("table");
    store().setNearbyInteraction("table");
    store().setNearbyInteraction(null);
    unsubscribe();
    expect(updates).toBe(2);
  });
});
