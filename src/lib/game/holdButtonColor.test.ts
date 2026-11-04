import { describe, expect, it } from "vitest";

import { getLaunchButtonColor, mixRgba } from "./holdButtonColor";

describe("getLaunchButtonColor", () => {
  it("0%는 기존 버튼 배경색이다", () => {
    expect(getLaunchButtonColor(0)).toBe("rgba(29, 20, 38, 0.8)");
  });

  it("50%는 기존 색과 #705711의 중간색이다", () => {
    // (29+112)/2=70.5→71, (20+87)/2=53.5→54, (38+17)/2=27.5→28, (0.8+1)/2=0.9
    expect(getLaunchButtonColor(0.5)).toBe("rgba(71, 54, 28, 0.9)");
  });

  it("100%는 정확히 #705711이다", () => {
    expect(getLaunchButtonColor(1)).toBe("rgba(112, 87, 17, 1)");
  });

  it("범위를 벗어난 진행률은 0~1로 자른다", () => {
    expect(getLaunchButtonColor(-0.5)).toBe(getLaunchButtonColor(0));
    expect(getLaunchButtonColor(1.5)).toBe(getLaunchButtonColor(1));
  });
});

describe("mixRgba", () => {
  it("각 채널을 선형 보간한다", () => {
    const from = { r: 0, g: 100, b: 200, a: 0 };
    const to = { r: 100, g: 0, b: 200, a: 1 };
    expect(mixRgba(from, to, 0.25)).toEqual({ r: 25, g: 75, b: 200, a: 0.25 });
  });
});
