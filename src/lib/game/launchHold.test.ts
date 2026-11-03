import { describe, expect, it } from "vitest";

import { LAUNCH_HOLD_DURATION_MS } from "@/constants/interaction";

import { IDLE_HOLD, getHoldProgress, isHoldComplete, releaseHold, startHold } from "./launchHold";

const DURATION = LAUNCH_HOLD_DURATION_MS;

describe("3초 홀드 (SPEC §6 STEP 4)", () => {
  it("발사까지 3초를 누르고 있어야 한다", () => {
    expect(DURATION).toBe(3000);
  });

  it("누르지 않으면 진행률 0, 누르면 경과 시간 비율", () => {
    expect(getHoldProgress(IDLE_HOLD, 5000, DURATION)).toBe(0);
    const hold = startHold(IDLE_HOLD, "key", 1000);
    expect(getHoldProgress(hold, 1000, DURATION)).toBe(0);
    expect(getHoldProgress(hold, 2500, DURATION)).toBeCloseTo(0.5);
    expect(getHoldProgress(hold, 99999, DURATION)).toBe(1);
  });

  it("3초 미만은 완료가 아니고, 3초가 되면 완료", () => {
    const hold = startHold(IDLE_HOLD, "pointer", 0);
    expect(isHoldComplete(hold, DURATION - 1, DURATION)).toBe(false);
    expect(isHoldComplete(hold, DURATION, DURATION)).toBe(true);
    expect(isHoldComplete(IDLE_HOLD, DURATION * 2, DURATION)).toBe(false);
  });

  it("누르는 중의 반복 시작(F키 반복 keydown)은 무시한다 → 시작 시각이 그대로다", () => {
    const hold = startHold(IDLE_HOLD, "key", 100);
    const repeated = startHold(hold, "key", 900);
    expect(repeated).toBe(hold);
    expect(getHoldProgress(repeated, 100 + DURATION, DURATION)).toBe(1);
  });

  it("다른 장치로 동시에 눌러도 겹치지 않는다 (키로 시작했으면 포인터 시작은 무시)", () => {
    const hold = startHold(IDLE_HOLD, "key", 0);
    expect(startHold(hold, "pointer", 500)).toBe(hold);
    // 포인터를 떼도 키 홀드는 유지된다
    expect(releaseHold(hold, "pointer")).toBe(hold);
  });

  it("시작한 장치를 떼면 바로 0%로 돌아간다 (3초 전에 떼면 취소)", () => {
    const hold = startHold(IDLE_HOLD, "key", 0);
    const released = releaseHold(hold, "key");
    expect(released).toBe(IDLE_HOLD);
    expect(getHoldProgress(released, 2999, DURATION)).toBe(0);
  });

  it("다시 누르면 0%부터 새로 센다 — 짧게 여러 번 눌러 시간을 쌓을 수 없다", () => {
    let hold = IDLE_HOLD;
    let now = 0;
    // 0.9초씩 4번 = 합 3.6초지만 매번 떼므로 한 번도 완료되지 않는다
    for (let i = 0; i < 4; i++) {
      hold = startHold(hold, "pointer", now);
      now += 900;
      expect(isHoldComplete(hold, now, DURATION)).toBe(false);
      hold = releaseHold(hold, "pointer");
      now += 50;
    }
    hold = startHold(hold, "pointer", now);
    expect(getHoldProgress(hold, now, DURATION)).toBe(0);
  });

  it("시계가 뒤로 가도 음수가 되지 않는다", () => {
    const hold = startHold(IDLE_HOLD, "key", 1000);
    expect(getHoldProgress(hold, 500, DURATION)).toBe(0);
  });
});
