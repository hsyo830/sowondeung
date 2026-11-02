import { describe, expect, it } from "vitest";

import {
  clampDelta,
  FLIGHT_RISE_SPEED,
  FLIGHT_SWAY_AMPLITUDE,
  getRiseOffset,
  getSpinAngle,
  getSwayOffset,
  MAX_DELTA_SEC,
  MAX_FLIGHT_HEIGHT,
  MAX_FLIGHT_SEC,
  shouldRemoveFlyingLantern,
} from "./flight";

describe("궤적", () => {
  it("0초에는 출발 위치·각도 그대로다", () => {
    expect(getRiseOffset(0)).toBe(0);
    expect(getSwayOffset(0)).toBe(0);
    expect(getSpinAngle(0)).toBe(0);
  });

  it("시간에 비례해 상승한다", () => {
    expect(getRiseOffset(2)).toBeCloseTo(2 * FLIGHT_RISE_SPEED);
    expect(getRiseOffset(3)).toBeGreaterThan(getRiseOffset(2));
  });

  it("좌우 흔들림은 진폭을 넘지 않는다", () => {
    for (let t = 0; t < 20; t += 0.13) {
      expect(Math.abs(getSwayOffset(t))).toBeLessThanOrEqual(FLIGHT_SWAY_AMPLITUDE + 1e-9);
    }
  });
});

describe("clampDelta", () => {
  it("상한을 넘는 delta는 상한으로 자른다 (탭 복귀)", () => {
    expect(clampDelta(5)).toBe(MAX_DELTA_SEC);
  });

  it("상한 이하는 그대로, 음수는 0", () => {
    expect(clampDelta(0.016)).toBe(0.016);
    expect(clampDelta(-1)).toBe(0);
  });
});

describe("shouldRemoveFlyingLantern", () => {
  it("높이·시간이 모두 한도 이하면 유지한다 (경계값 포함)", () => {
    expect(shouldRemoveFlyingLantern(MAX_FLIGHT_HEIGHT, MAX_FLIGHT_SEC)).toBe(false);
  });

  it("높이가 한도를 넘으면 제거한다", () => {
    expect(shouldRemoveFlyingLantern(MAX_FLIGHT_HEIGHT + 0.01, 1)).toBe(true);
  });

  it("경과 시간이 한도를 넘으면 제거한다", () => {
    expect(shouldRemoveFlyingLantern(0, MAX_FLIGHT_SEC + 0.01)).toBe(true);
  });
});
