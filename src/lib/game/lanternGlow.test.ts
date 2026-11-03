import { describe, expect, it } from "vitest";

import { LANTERN_COLORS, LANTERN_INNER_GLOW_HEX } from "@/constants/lanternColors";

import { getLanternGlow, multiplyHex } from "./lanternGlow";
import { LANTERN_GLOW_CONFIG } from "./worldConfig";

const SETTINGS = LANTERN_GLOW_CONFIG.glow;
const { flicker, igniteRiseSec, igniteBoost } = SETTINGS;

describe("getLanternGlow — 점화한 천등의 밝기", () => {
  it("점화 순간에는 0에서 시작한다 (꺼져 있다가 밝아짐)", () => {
    expect(getLanternGlow(12.3, 0, 0.7, SETTINGS)).toBe(0);
  });

  it("점화 직후 기본 밝기보다 잠깐 더 밝아진다", () => {
    const peak = getLanternGlow(5, igniteRiseSec, 0.7, SETTINGS);
    expect(peak).toBeGreaterThan(1 + flicker);
    expect(peak).toBeLessThanOrEqual(1 + flicker + igniteBoost + 1e-9);
  });

  it("2초 뒤에는 기본 밝기 근처에서만 흔들린다", () => {
    for (let t = 2; t < 30; t += 0.37) {
      const glow = getLanternGlow(t * 1.1, t, 0.7, SETTINGS);
      expect(glow).toBeGreaterThanOrEqual(1 - flicker - 0.01);
      expect(glow).toBeLessThanOrEqual(1 + flicker + 0.01);
    }
  });

  it("발사 천등(secSinceLit = null)은 점화 연출 없이 흔들림만", () => {
    for (let t = 0; t < 10; t += 0.21) {
      const glow = getLanternGlow(t, null, 3, SETTINGS);
      expect(glow).toBeGreaterThanOrEqual(1 - flicker - 1e-9);
      expect(glow).toBeLessThanOrEqual(1 + flicker + 1e-9);
    }
  });

  it("실제로 흔들린다 (시간에 따라 값이 바뀐다)", () => {
    const values = new Set([0, 0.5, 1, 1.5, 2].map((t) => getLanternGlow(t, null, 1, SETTINGS)));
    expect(values.size).toBeGreaterThan(1);
  });

  it("음수가 되지 않는다", () => {
    for (let t = -1; t < 3; t += 0.05) {
      expect(getLanternGlow(t, t, 0, SETTINGS)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("multiplyHex — 종이색 × 안쪽 불빛 색", () => {
  it("흰색을 곱하면 그대로, 검정은 검정 (손글씨는 빛나지 않는다)", () => {
    expect(multiplyHex("#ff7598", "#ffffff")).toBe("#ff7598");
    expect(multiplyHex("#000000", LANTERN_INNER_GLOW_HEX)).toBe("#000000");
  });

  it("채널별 곱", () => {
    expect(multiplyHex("#ff8040", "#80ff40")).toBe("#808010");
  });

  it("4색 모두 채널 크기 순서(색상 계열)가 유지된다 — 분홍이 살구색으로 바뀌지 않는다", () => {
    for (const color of LANTERN_COLORS) {
      const lit = multiplyHex(color.hex, LANTERN_INNER_GLOW_HEX);
      const channels = (hex: string) =>
        [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
      const [r, g, b] = channels(lit);
      const [r0, g0, b0] = channels(color.hex);
      expect(Math.sign(r - g)).toBe(Math.sign(r0 - g0));
      expect(Math.sign(r - b)).toBe(Math.sign(r0 - b0));
      expect(Math.sign(g - b)).toBe(Math.sign(g0 - b0));
    }
  });
});
