import { describe, expect, it } from "vitest";

import {
  canPlayAfterCooldown,
  countFootstepContacts,
  getCampfireProximity,
  getFootstepNormalize,
  getGameSoundEvents,
  getJitter,
  pickFootstepIndex,
} from "./soundRules";
import type { GameSoundSnapshot } from "./soundRules";

function snapshot(overrides: Partial<GameSoundSnapshot> = {}): GameSoundSnapshot {
  return {
    mode: "EXPLORE",
    held: { status: "NONE", colorId: "pink" },
    flying: [],
    ...overrides,
  };
}

describe("게임 상태 변화 → 효과음", () => {
  it("천등 받기 (NONE → BLANK): 종이", () => {
    const before = snapshot({ mode: "COLOR_SELECT" });
    const after = snapshot({ held: { status: "BLANK", colorId: "sky" } });
    expect(getGameSoundEvents(before, after)).toEqual(["paper"]);
  });

  it("색상 다시 고르기 (BLANK에서 색만 변경): 종이. 같은 색이면 없음", () => {
    const before = snapshot({ mode: "COLOR_SELECT", held: { status: "BLANK", colorId: "pink" } });
    expect(
      getGameSoundEvents(before, snapshot({ held: { status: "BLANK", colorId: "lime" } })),
    ).toEqual(["paper"]);
    expect(
      getGameSoundEvents(before, snapshot({ held: { status: "BLANK", colorId: "pink" } })),
    ).toEqual([]);
  });

  it("색상 선택 창만 열고 닫으면 소리가 없다", () => {
    const explore = snapshot({ held: { status: "BLANK", colorId: "pink" } });
    const select = { ...explore, mode: "COLOR_SELECT" as const };
    expect(getGameSoundEvents(explore, select)).toEqual([]);
    expect(getGameSoundEvents(select, explore)).toEqual([]);
  });

  it("작성 화면을 열 때 종이, 닫을 때는 없음", () => {
    const explore = snapshot({ held: { status: "BLANK", colorId: "pink" } });
    const writing = { ...explore, mode: "WRITING" as const };
    expect(getGameSoundEvents(explore, writing)).toEqual(["paper"]);
    expect(getGameSoundEvents(writing, explore)).toEqual([]);
  });

  it("점화 성공 (WRITTEN → LIT)에서만 점화 소리", () => {
    const written = snapshot({ held: { status: "WRITTEN", colorId: "pink" } });
    const lit = snapshot({ held: { status: "LIT", colorId: "pink" } });
    expect(getGameSoundEvents(written, lit)).toEqual(["ignite"]);
    // 거부된 점화(상태가 그대로)는 store가 갱신되지 않거나, 갱신되어도 전이가 아니다
    expect(getGameSoundEvents(lit, lit)).toEqual([]);
  });

  it("홀드 완료(LAUNCHING 시작)만으로는 발사 소리가 나지 않는다", () => {
    const lit = snapshot({ held: { status: "LIT", colorId: "pink" } });
    expect(getGameSoundEvents(lit, { ...lit, mode: "LAUNCHING" })).toEqual([]);
  });

  it("천등이 실제로 분리되어 발사 목록에 새 id가 생긴 순간 발사 소리 한 번", () => {
    const before = snapshot({ mode: "LAUNCHING", held: { status: "LIT", colorId: "pink" } });
    const after = snapshot({ mode: "LAUNCHING", flying: [{ id: "lantern-1" }] });
    expect(getGameSoundEvents(before, after)).toEqual(["launch"]);
    // 같은 목록으로 다시 갱신(Praying 끝 → EXPLORE)되어도 다시 나지 않는다
    expect(getGameSoundEvents(after, { ...after, mode: "EXPLORE" })).toEqual([]);
  });

  it("오래된 천등이 사라지는 것은 발사가 아니다", () => {
    const before = snapshot({ flying: [{ id: "lantern-1" }, { id: "lantern-2" }] });
    const after = snapshot({ flying: [{ id: "lantern-2" }] });
    expect(getGameSoundEvents(before, after)).toEqual([]);
  });
});

describe("연타 제한", () => {
  it("cooldown 안의 재요청은 막고, 지나면 허용한다", () => {
    expect(canPlayAfterCooldown(null, 0, 70)).toBe(true);
    expect(canPlayAfterCooldown(1000, 1050, 70)).toBe(false);
    expect(canPlayAfterCooldown(1000, 1070, 70)).toBe(true);
  });
});

describe("발 디딤 시점", () => {
  const CONTACTS = [0.33, 0.85];

  it("이전 → 지금 사이에 지난 시점만 센다", () => {
    expect(countFootstepContacts(0, 0.3, CONTACTS)).toBe(0);
    expect(countFootstepContacts(0.3, 0.34, CONTACTS)).toBe(1);
    expect(countFootstepContacts(0.33, 0.4, CONTACTS)).toBe(0);
    expect(countFootstepContacts(0.2, 0.9, CONTACTS)).toBe(2);
  });

  it("클립이 처음으로 돌아간 프레임도 센다", () => {
    expect(countFootstepContacts(1.0, 0.02, CONTACTS)).toBe(0);
    expect(countFootstepContacts(0.8, 0.02, CONTACTS)).toBe(1);
    expect(countFootstepContacts(0.9, 0.35, CONTACTS)).toBe(1);
  });

  it("시간이 그대로면(멈춤) 0", () => {
    expect(countFootstepContacts(0.33, 0.33, CONTACTS)).toBe(0);
  });
});

describe("걸음 소리 고르기", () => {
  it("바로 앞 걸음과 같은 구간을 연속으로 고르지 않는다", () => {
    for (let previous = 0; previous < 5; previous += 1) {
      for (const random of [0, 0.25, 0.5, 0.75, 0.9999]) {
        const index = pickFootstepIndex(previous, 5, random);
        expect(index).not.toBe(previous);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(5);
      }
    }
  });

  it("처음이거나 구간이 하나뿐이면 범위 안에서 고른다", () => {
    expect(pickFootstepIndex(null, 14, 0.9999)).toBe(13);
    expect(pickFootstepIndex(null, 14, 0)).toBe(0);
    expect(pickFootstepIndex(0, 1, 0.5)).toBe(0);
  });

  it("세기 보정은 목표 세기에 맞추되 범위를 넘지 않는다", () => {
    expect(getFootstepNormalize({ peak: 0.6 }, 0.6, 0.6, 1.5)).toBeCloseTo(1);
    expect(getFootstepNormalize({ peak: 1 }, 0.6, 0.6, 1.5)).toBeCloseTo(0.6);
    expect(getFootstepNormalize({ peak: 0.2 }, 0.6, 0.6, 1.5)).toBe(1.5);
  });

  it("흔들림 배율은 1 ± jitter", () => {
    expect(getJitter(0.1, 0)).toBeCloseTo(0.9);
    expect(getJitter(0.1, 0.5)).toBeCloseTo(1);
    expect(getJitter(0.1, 0.99999)).toBeCloseTo(1.1);
  });
});

describe("모닥불 근접도", () => {
  it("가까우면 1, 멀면 0, 사이는 가까울수록 커진다", () => {
    expect(getCampfireProximity(1, 2.6, 11)).toBe(1);
    expect(getCampfireProximity(11, 2.6, 11)).toBe(0);
    expect(getCampfireProximity(20, 2.6, 11)).toBe(0);
    const near = getCampfireProximity(4.5, 2.6, 11);
    const far = getCampfireProximity(8, 2.6, 11);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
    expect(near).toBeLessThan(1);
  });
});
