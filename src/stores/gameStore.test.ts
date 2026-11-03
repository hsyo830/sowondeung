import { beforeEach, describe, expect, it } from "vitest";

import { MAX_FLYING_LANTERNS } from "@/lib/game/flight";
import { EMPTY_HELD_LANTERN } from "@/lib/game/lanternTransitions";
import type { LaunchPose, Stroke } from "@/types/game";

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
  useGameStore.setState({
    held: EMPTY_HELD_LANTERN,
    mode: "EXPLORE",
    flying: [],
    nearbyInteractionId: null,
  });
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

const POSE: LaunchPose = { spawn: [1, 1.2, 4], yaw: Math.PI, drift: [0.4, 0] };

/** 받기 → 작성 완료까지 (WRITTEN) */
function prepareWritten(colorId: "red" | "pink" = "pink", strokes: readonly Stroke[] = INK) {
  store().openColorSelect();
  store().receiveLantern(colorId);
  store().openWriting();
  store().finishWriting(strokes);
}

/** 받기 → 작성 → 점화까지 (LIT) */
function prepareLit() {
  prepareWritten();
  store().lightLantern();
}

/**
 * 홀드 완료 → (Throw에서 손을 놓음) → (Praying 끝) 순서로 store 액션만 부른다.
 * 실제 게임에서는 LaunchHoldButton → CharacterModel의 onThrowRelease → onLaunchAnimationEnd가 이 순서로 부른다.
 */
function launchAndFinish(): boolean {
  const isBegun = store().beginLaunch();
  const isLaunched = store().launchLantern(POSE);
  const isFinished = store().finishLaunch();
  return isBegun && isLaunched && isFinished;
}

describe("점화 (WRITTEN → LIT)", () => {
  it("빈 천등·미작성 천등은 점화할 수 없다 (기획 §11 #2)", () => {
    expect(store().lightLantern()).toBe(false);
    expect(store().runInteractionAction("lightLantern")).toBe(false);
    store().openColorSelect();
    store().receiveLantern("red");
    expect(store().lightLantern()).toBe(false);
    expect(store().held.status).toBe("BLANK");
  });

  it("WRITTEN에서 점화하면 LIT, 색·획은 그대로다", () => {
    prepareWritten();
    const before = store().held;
    expect(store().runInteractionAction("lightLantern")).toBe(true);
    expect(store().held).toMatchObject({
      status: "LIT",
      id: before.id,
      colorId: "pink",
      strokes: INK,
    });
  });

  it("중복 점화는 거부된다 (상태 객체도 그대로)", () => {
    prepareWritten();
    store().lightLantern();
    const lit = store().held;
    expect(store().lightLantern()).toBe(false);
    expect(store().held).toBe(lit);
  });

  it("점화 후에는 수정·색상 변경을 열 수 없다 (기획 §11 #6)", () => {
    prepareWritten();
    store().lightLantern();
    expect(store().openWriting()).toBe(false);
    expect(store().runInteractionAction("editWish")).toBe(false);
    expect(store().openColorSelect()).toBe(false);
    expect(store().runInteractionAction("reselectColor")).toBe(false);
    expect(store().mode).toBe("EXPLORE");
    expect(store().held.status).toBe("LIT");
  });

  it("탐색 모드가 아니면 점화하지 않는다", () => {
    prepareWritten();
    store().openWriting();
    expect(store().lightLantern()).toBe(false);
    expect(store().held.status).toBe("WRITTEN");
  });
});

describe("발사 동작 시작 (3초 홀드 완료 → LAUNCHING)", () => {
  it("EXPLORE + LIT에서만 시작하고, 천등은 아직 손에 있다", () => {
    expect(store().beginLaunch()).toBe(false);
    prepareWritten();
    expect(store().beginLaunch()).toBe(false);
    store().lightLantern();
    expect(store().beginLaunch()).toBe(true);
    expect(store().mode).toBe("LAUNCHING");
    expect(store().held.status).toBe("LIT");
    expect(store().flying).toHaveLength(0);
  });

  it("두 번 시작해도 두 번째는 거부된다", () => {
    prepareLit();
    expect(store().beginLaunch()).toBe(true);
    expect(store().beginLaunch()).toBe(false);
  });

  it("발사 동작 중에는 상호작용·점화·오버레이가 열리지 않고, ESC(closeOverlay)로 잠금이 풀리지 않는다", () => {
    prepareLit();
    store().beginLaunch();
    store().launchLantern(POSE);
    // 손이 빈(NONE) 상태라도 기도가 끝나기 전에는 받기를 열 수 없다
    expect(store().openColorSelect()).toBe(false);
    expect(store().runInteractionAction("receiveLantern")).toBe(false);
    expect(store().openWriting()).toBe(false);
    expect(store().lightLantern()).toBe(false);
    store().closeOverlay();
    expect(store().mode).toBe("LAUNCHING");
  });

  it("finishLaunch는 LAUNCHING에서만 탐색으로 돌아간다", () => {
    expect(store().finishLaunch()).toBe(false);
    prepareLit();
    store().beginLaunch();
    store().launchLantern(POSE);
    expect(store().finishLaunch()).toBe(true);
    expect(store().mode).toBe("EXPLORE");
    expect(store().finishLaunch()).toBe(false);
  });
});

describe("천등 분리 (Throw에서 손을 놓는 순간: LIT → NONE + 발사 천등)", () => {
  it("LIT이 아니면 분리할 수 없다", () => {
    useGameStore.setState({ mode: "LAUNCHING" });
    expect(store().launchLantern(POSE)).toBe(false);
    useGameStore.setState({ mode: "EXPLORE" });
    prepareWritten();
    useGameStore.setState({ mode: "LAUNCHING" });
    expect(store().launchLantern(POSE)).toBe(false);
    expect(store().flying).toHaveLength(0);
    expect(store().held.status).toBe("WRITTEN");
  });

  it("발사 동작(LAUNCHING)이 아니면 분리하지 않는다 (홀드 완료 즉시 분리되지 않음)", () => {
    prepareLit();
    expect(store().launchLantern(POSE)).toBe(false);
    useGameStore.setState({ mode: "WRITING" });
    expect(store().launchLantern(POSE)).toBe(false);
    expect(store().held.status).toBe("LIT");
    expect(store().flying).toHaveLength(0);
  });

  it("분리하면 한 번의 갱신으로 손은 비고, 발사 천등에 색·획(같은 참조)·출발 정보가 남는다", () => {
    prepareWritten("red");
    store().lightLantern();
    store().beginLaunch();
    const { id } = store().held;
    let updates = 0;
    const unsubscribe = useGameStore.subscribe(() => {
      updates += 1;
    });
    expect(store().launchLantern(POSE)).toBe(true);
    unsubscribe();

    expect(updates).toBe(1);
    expect(store().held).toBe(EMPTY_HELD_LANTERN);
    expect(store().flying).toEqual([{ id, colorId: "red", strokes: INK, ...POSE }]);
    expect(store().flying[0].strokes).toBe(INK);
    // 기도가 끝날 때까지 발사 동작 모드는 유지된다
    expect(store().mode).toBe("LAUNCHING");
  });

  it("같은 프레임에 두 번 호출돼도 한 번만 발사된다 (기획 §11 #9)", () => {
    prepareLit();
    store().beginLaunch();
    expect(store().launchLantern(POSE)).toBe(true);
    expect(store().launchLantern(POSE)).toBe(false);
    expect(store().flying).toHaveLength(1);
  });

  it("발사 동작이 끝난 뒤 다시 받을 수 있고, 새 천등은 새 id·빈 획으로 시작한다 (기획 §11 #10)", () => {
    prepareWritten("red");
    store().lightLantern();
    const firstId = store().held.id;
    launchAndFinish();

    expect(store().openColorSelect()).toBe(true);
    expect(store().receiveLantern("pink")).toBe(true);
    expect(store().held).toMatchObject({ status: "BLANK", colorId: "pink", strokes: [] });
    expect(store().held.id).not.toBe(firstId);
    // 발사된 천등은 그대로 남아 있다
    expect(store().flying.map((lantern) => lantern.id)).toEqual([firstId]);
    expect(store().flying[0]).toMatchObject({ colorId: "red", strokes: INK });
  });

  it("전체 흐름을 반복해도 이전 천등 데이터가 섞이지 않고, 최대 5개를 넘으면 오래된 것부터 빠진다", () => {
    const launchedIds: string[] = [];
    for (let i = 0; i < MAX_FLYING_LANTERNS + 3; i++) {
      const strokes: readonly Stroke[] = [[{ x: i, y: i }]];
      prepareWritten(i % 2 === 0 ? "red" : "pink", strokes);
      expect(store().held.strokes).toBe(strokes);
      store().lightLantern();
      launchedIds.push(store().held.id);
      expect(launchAndFinish()).toBe(true);
      expect(store().held).toBe(EMPTY_HELD_LANTERN);
      expect(store().mode).toBe("EXPLORE");
    }
    const flying = store().flying;
    expect(flying).toHaveLength(MAX_FLYING_LANTERNS);
    expect(flying.map((lantern) => lantern.id)).toEqual(launchedIds.slice(-MAX_FLYING_LANTERNS));
    expect(new Set(flying.map((lantern) => lantern.id)).size).toBe(MAX_FLYING_LANTERNS);
    // 각 발사 천등은 자기 발사 순간의 획을 들고 있다
    flying.forEach((lantern, index) => {
      const i = MAX_FLYING_LANTERNS + 3 - MAX_FLYING_LANTERNS + index;
      expect(lantern.strokes).toEqual([[{ x: i, y: i }]]);
    });
  });
});

describe("발사 천등 제거", () => {
  it("수명이 끝난 천등 하나만 빠지고, 두 번 제거해도 변화가 없다", () => {
    for (let i = 0; i < 2; i++) {
      prepareWritten();
      store().lightLantern();
      launchAndFinish();
    }
    const [first, second] = store().flying;
    expect(store().removeFlyingLantern(first.id)).toBe(true);
    expect(store().flying).toEqual([second]);

    let updates = 0;
    const unsubscribe = useGameStore.subscribe(() => {
      updates += 1;
    });
    expect(store().removeFlyingLantern(first.id)).toBe(false);
    unsubscribe();
    expect(updates).toBe(0);
  });

  it("발사 천등을 제거해도 손에 든 새 천등에는 영향이 없다", () => {
    prepareWritten();
    store().lightLantern();
    launchAndFinish();
    const flyingId = store().flying[0].id;
    prepareWritten("red", EDITED_INK);
    const held = store().held;
    store().removeFlyingLantern(flyingId);
    expect(store().held).toBe(held);
  });
});
