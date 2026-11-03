import { describe, expect, it } from "vitest";

import { smoothstep01, stepToward, stepViewBlend } from "./camera";

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
