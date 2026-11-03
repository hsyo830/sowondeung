import { describe, expect, it } from "vitest";

import { getSkyBackdropColor, mixRgb } from "./sky";
import type { Rgb, SkyBackdropShape, SkyPalette } from "./sky";

const PALETTE: SkyPalette = {
  horizon: [0.6, 0.5, 0.6],
  band: [0.7, 0.5, 0.7],
  glow: [1, 0.6, 0.4],
  upper: [0.5, 0.45, 0.8],
  zenith: [0.2, 0.2, 0.5],
};
const SHAPE: SkyBackdropShape = {
  bottomY: 1,
  bandY: 2,
  upperY: 4,
  topY: 10,
  glowDirX: 0,
  glowDirZ: -1,
};

function expectRgbClose(actual: Rgb, expected: Rgb) {
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 6));
}

describe("mixRgb", () => {
  it("t를 0~1로 자르고 선형 보간한다", () => {
    expectRgbClose(mixRgb([0, 0, 0], [1, 1, 1], 0.25), [0.25, 0.25, 0.25]);
    expectRgbClose(mixRgb([0, 0, 0], [1, 1, 1], 2), [1, 1, 1]);
    expectRgbClose(mixRgb([0, 0, 0], [1, 1, 1], -1), [0, 0, 0]);
  });
});

describe("getSkyBackdropColor", () => {
  it("아래쪽은 방향과 상관없이 정확히 안개색(horizon)이다", () => {
    for (const [x, z] of [
      [0, -1],
      [1, 0],
      [0, 1],
    ]) {
      expect(getSkyBackdropColor(SHAPE.bottomY, x, z, PALETTE, SHAPE)).toBe(PALETTE.horizon);
      expect(getSkyBackdropColor(-5, x, z, PALETTE, SHAPE)).toBe(PALETTE.horizon);
    }
  });

  it("띠 높이에서 노을 쪽은 glow, 반대쪽은 band다", () => {
    expectRgbClose(getSkyBackdropColor(SHAPE.bandY, 0, -1, PALETTE, SHAPE), PALETTE.glow);
    expectRgbClose(getSkyBackdropColor(SHAPE.bandY, 0, 1, PALETTE, SHAPE), PALETTE.band);
  });

  it("upper·top 높이에서는 방향과 상관없이 upper·zenith다", () => {
    expectRgbClose(getSkyBackdropColor(SHAPE.upperY, 1, 0, PALETTE, SHAPE), PALETTE.upper);
    expectRgbClose(getSkyBackdropColor(SHAPE.topY, 0, -1, PALETTE, SHAPE), PALETTE.zenith);
    expectRgbClose(getSkyBackdropColor(50, 0, 1, PALETTE, SHAPE), PALETTE.zenith);
  });

  it("높이에 따라 끊기지 않고 이어진다 (구간 경계에서 색이 튀지 않음)", () => {
    for (let y = 0.5; y < 11; y += 0.01) {
      const a = getSkyBackdropColor(y, 0.6, -0.8, PALETTE, SHAPE);
      const b = getSkyBackdropColor(y + 0.01, 0.6, -0.8, PALETTE, SHAPE);
      a.forEach((value, i) => expect(Math.abs(value - b[i])).toBeLessThan(0.02));
    }
  });
});
