import { describe, expect, it } from "vitest";

import {
  getLaunchFocusHeight,
  smoothDamp,
  getLaunchLookDuration,
  getLaunchLookRestartSec,
  getLaunchLookWeight,
  smoothstep01,
  stepToward,
  stepViewBlend,
} from "./camera";
import { CAMERA_CONFIG } from "./worldConfig";

describe("stepToward", () => {
  it("목표 쪽으로 maxStep만큼 움직이고 넘어가지 않는다", () => {
    expect(stepToward(0, 1, 0.3)).toBeCloseTo(0.3);
    expect(stepToward(0.9, 1, 0.3)).toBe(1);
    expect(stepToward(1, 0, 0.25)).toBeCloseTo(0.75);
    expect(stepToward(0.1, 0, 0.25)).toBe(0);
  });
});

describe("smoothstep01", () => {
  it("양 끝은 0·1, 가운데는 0.5, 범위 밖은 자른다", () => {
    expect(smoothstep01(0)).toBe(0);
    expect(smoothstep01(1)).toBe(1);
    expect(smoothstep01(0.5)).toBeCloseTo(0.5);
    expect(smoothstep01(-1)).toBe(0);
    expect(smoothstep01(2)).toBe(1);
  });
});

describe("stepViewBlend", () => {
  it("작성 모드로 transitionSec 동안 0 → 1, 끝나면 정확히 1", () => {
    let blend = 0;
    for (let i = 0; i < 6; i++) blend = stepViewBlend(blend, true, 0.1, 0.6);
    expect(blend).toBeCloseTo(1);
    expect(stepViewBlend(blend, true, 0.1, 0.6)).toBe(1);
  });

  it("3인칭으로 돌아오면 정확히 0이 된다 (2단계 카메라 동작으로 복귀)", () => {
    let blend = 1;
    for (let i = 0; i < 10; i++) blend = stepViewBlend(blend, false, 0.1, 0.6);
    expect(blend).toBe(0);
  });

  it("전환 중간에 모드가 바뀌면 그 자리에서 되돌아간다", () => {
    const halfway = stepViewBlend(stepViewBlend(0, true, 0.15, 0.6), true, 0.15, 0.6);
    expect(halfway).toBeCloseTo(0.5);
    expect(stepViewBlend(halfway, false, 0.15, 0.6)).toBeCloseTo(0.25);
  });
});

describe("발사 카메라 연출 (천등 따라 보기)", () => {
  const timing = CAMERA_CONFIG.launchLook;
  const end = getLaunchLookDuration(timing);
  const weight = (t: number) => getLaunchLookWeight(t, timing);

  it("1초 대기 → 3초 추적 → 1초 복귀, 끝나면 정확히 0", () => {
    const { delaySec, followSec, easeInSec, returnSec } = timing;
    expect([delaySec, followSec, returnSec]).toEqual([1, 3, 1]);
    expect(end).toBeCloseTo(5);
    expect(weight(0)).toBe(0);
    expect(weight(delaySec)).toBe(0);
    expect(weight(delaySec + easeInSec / 2)).toBeCloseTo(0.5);
    expect(weight(delaySec + easeInSec)).toBe(1);
    expect(weight(delaySec + followSec - 0.01)).toBe(1);
    expect(weight(delaySec + followSec + returnSec / 2)).toBeCloseTo(0.5);
    expect(weight(end)).toBe(0);
    expect(weight(end + 5)).toBe(0);
  });

  it("대기 동안은 기존 시점 그대로 (세기 0)", () => {
    for (let t = 0; t <= timing.delaySec; t += 0.1) expect(weight(t)).toBe(0);
  });

  it("천등이 화면 중앙보다 위에 보이도록 시선점은 천등보다 아래에서 따라간다", () => {
    expect(timing.lanternAboveCenter).toBeGreaterThan(0);
    expect(timing.lookLift).toBeGreaterThan(0);
  });

  it("프레임 간 변화가 작다 (60fps에서 한 프레임 최대 변화 < 5%)", () => {
    const frame = 1 / 60;
    for (let t = 0; t < end + 0.1; t += frame) {
      expect(Math.abs(weight(t + frame) - weight(t))).toBeLessThan(0.05);
    }
  });

  it("연출 중 새 발사: 세기가 이어지고(튐 없음) 다시 옮겨 가는 구간으로 돌아간다", () => {
    for (let t = 0; t < end; t += 0.05) {
      const restart = getLaunchLookRestartSec(t, timing);
      expect(weight(restart)).toBeCloseTo(weight(t), 6);
      expect(restart).toBeLessThanOrEqual(timing.delaySec + timing.easeInSec + 1e-9);
    }
    expect(getLaunchLookRestartSec(end + 1, timing)).toBe(0);
  });
});

describe("getLaunchFocusHeight — 발사 연출 시선 높이", () => {
  const settings = CAMERA_CONFIG.launchLook;
  // 3인칭 기본: 카메라는 시선점보다 3.2 높고 수평 6.5 떨어져 있다
  const cameraY = 5;
  const distance = 6.5;
  const baseLookY = 1.8;
  const angleOf = (y: number) => (Math.atan2(y - cameraY, distance) * 180) / Math.PI;

  it("천등이 낮아도 평소보다 위를 본다 (시선이 내려가지 않음)", () => {
    const y = getLaunchFocusHeight(cameraY, distance, baseLookY, 1.2, settings);
    expect(angleOf(y)).toBeGreaterThan(angleOf(baseLookY) + 5);
  });

  it("천등이 화면 밖으로 나가지 않는다: 시선과 천등 방향 차이 ≤ maxLanternOffsetDeg", () => {
    for (const lanternY of [0.8, 1.2, 2, 3, 5, 8]) {
      const y = getLaunchFocusHeight(cameraY, distance, baseLookY, lanternY, settings);
      expect(Math.abs(angleOf(y) - angleOf(lanternY))).toBeLessThanOrEqual(
        settings.maxLanternOffsetDeg + 1e-9,
      );
    }
  });

  it("천등이 충분히 오르면 시선점이 천등보다 아래 → 천등이 화면 중앙보다 위", () => {
    const lanternY = 4;
    const y = getLaunchFocusHeight(cameraY, distance, baseLookY, lanternY, settings);
    expect(y).toBeLessThan(lanternY);
  });
});

describe("smoothDamp — 시선 각도 스프링", () => {
  const MAX = 0.1; // rad/s
  const DT = 1 / 60;

  it("속도 0에서 부드럽게 출발한다 (첫 프레임 변화가 아주 작다)", () => {
    const state = { value: 0, velocity: 0 };
    smoothDamp(state, 1, 0.8, MAX, DT);
    expect(state.value).toBeGreaterThan(0);
    expect(state.value).toBeLessThan(MAX * DT);
  });

  it("최대 각속도를 넘지 않고, 목표를 넘어가지 않으며 결국 닿는다", () => {
    const state = { value: 0, velocity: 0 };
    let previous = 0;
    for (let i = 0; i < 60 * 30; i++) {
      smoothDamp(state, 0.5, 0.8, MAX, DT);
      expect(state.value - previous).toBeLessThanOrEqual(MAX * DT + 1e-12);
      expect(state.value).toBeLessThanOrEqual(0.5);
      previous = state.value;
    }
    expect(state.value).toBeCloseTo(0.5, 4);
  });

  it("목표가 0으로 바뀌면 지금 값에서 이어서 돌아온다 (순간 변화 없음)", () => {
    const state = { value: 0.3, velocity: 0.05 };
    const before = state.value;
    smoothDamp(state, 0, 0.35, 0.3, DT);
    expect(Math.abs(state.value - before)).toBeLessThanOrEqual(0.3 * DT + 1e-12);
  });

  it("dt가 0이면 그대로", () => {
    const state = { value: 0.2, velocity: 0.1 };
    smoothDamp(state, 1, 0.5, 1, 0);
    expect(state).toEqual({ value: 0.2, velocity: 0.1 });
  });
});
