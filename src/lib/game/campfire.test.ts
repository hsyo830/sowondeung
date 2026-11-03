import { describe, expect, it } from "vitest";

import {
  deformFlamePositions,
  getFlameHeat,
  getFlameMotion,
  wobble,
  writeFlameColors,
} from "./campfire";
import type {
  FlameColorConfig,
  FlameMotion,
  FlameMotionConfig,
  FlamePalette,
  FlameShape,
} from "./campfire";

const SHAPE: FlameShape = { centerX: 1, centerZ: 1, baseY: 0.7, topY: 2 };
const CONFIG: FlameMotionConfig = { stretch: 0.1, sway: 0.1, flutter: 0.03, glow: 0.15 };
const STILL: FlameMotion = { stretch: 1, swayX: 0, swayZ: 0, glow: 1 };

function deform(base: number[], motion: FlameMotion, config = CONFIG, timeSec = 0) {
  const out = new Float32Array(base.length);
  deformFlamePositions(base, out, SHAPE, motion, config, timeSec);
  return Array.from(out);
}

describe("wobble", () => {
  it("항상 -1~1 범위다", () => {
    for (let t = 0; t < 200; t += 0.037) {
      const value = wobble(t, 1.3);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("같은 입력이면 같은 값, 시드가 다르면 다른 값", () => {
    expect(wobble(3.2, 0.5)).toBe(wobble(3.2, 0.5));
    expect(wobble(3.2, 0.5)).not.toBeCloseTo(wobble(3.2, 2.5), 3);
  });

  it("가장 느린 사인의 한 주기 뒤에도 같은 값으로 돌아오지 않는다 (기계적 반복 방지)", () => {
    const period = (2 * Math.PI) / 1.13;
    const diffs = [0.3, 1.7, 4.2].map((t) => Math.abs(wobble(t, 0) - wobble(t + period, 0)));
    expect(Math.max(...diffs)).toBeGreaterThan(0.05);
  });

  it("짧은 간격에서 급하게 튀지 않는다 (부드러운 일렁임)", () => {
    for (let t = 0; t < 30; t += 0.1) {
      expect(Math.abs(wobble(t + 1 / 60, 0) - wobble(t, 0))).toBeLessThan(0.1);
    }
  });
});

describe("getFlameMotion", () => {
  it("설정한 세기 범위 안에서만 움직인다", () => {
    for (let t = 0; t < 120; t += 0.05) {
      const motion = getFlameMotion(t, CONFIG);
      expect(Math.abs(motion.stretch - 1)).toBeLessThanOrEqual(CONFIG.stretch + 1e-9);
      expect(Math.abs(motion.swayX)).toBeLessThanOrEqual(CONFIG.sway + 1e-9);
      expect(Math.abs(motion.swayZ)).toBeLessThanOrEqual(CONFIG.sway + 1e-9);
      expect(Math.abs(motion.glow - 1)).toBeLessThanOrEqual(CONFIG.glow + 1e-9);
    }
  });

  it("세기가 0이면 움직이지 않는다", () => {
    const motion = getFlameMotion(12.3, { stretch: 0, sway: 0, flutter: 0, glow: 0 });
    // 0 × 음수 = -0이라 toEqual 대신 값으로 비교한다
    expect(motion.stretch).toBe(1);
    expect(motion.glow).toBe(1);
    expect(Math.abs(motion.swayX)).toBe(0);
    expect(Math.abs(motion.swayZ)).toBe(0);
  });
});

describe("deformFlamePositions", () => {
  it("바닥 높이 이하 정점은 그대로 둔다 (밑동이 장작에서 떨어지지 않음)", () => {
    const base = [1.5, 0.7, 1.2, 0.4, 0.2, 0.9];
    const motion: FlameMotion = { stretch: 1.1, swayX: 0.1, swayZ: -0.1, glow: 1 };
    expect(deform(base, motion, CONFIG, 2.5)).toEqual(Array.from(new Float32Array(base)));
  });

  it("움직임이 없으면 모든 정점이 그대로다", () => {
    const base = [1.5, 1.2, 0.8, 0.6, 1.9, 1.3];
    const still = deform(base, STILL, { ...CONFIG, flutter: 0 });
    still.forEach((value, i) => expect(value).toBeCloseTo(base[i], 5));
  });

  it("세로 배율은 바닥 높이 기준으로 늘린다", () => {
    const [, y] = deform([1, 2, 1], { ...STILL, stretch: 1.1 }, { ...CONFIG, flutter: 0 });
    expect(y).toBeCloseTo(0.7 + 1.3 * 1.1, 5);
  });

  it("흔들림은 끝으로 갈수록 크다 (통째로 기울지 않음)", () => {
    const motion: FlameMotion = { ...STILL, swayX: 0.1 };
    const config = { ...CONFIG, flutter: 0 };
    const [lowX] = deform([1, 0.7 + 1.3 * 0.25, 1], motion, config);
    const [highX] = deform([1, 2, 1], motion, config);
    expect(lowX - 1).toBeCloseTo(0.1 * 0.0625, 5);
    expect(highX - 1).toBeCloseTo(0.1, 5);
  });

  it("base 배열을 바꾸지 않는다", () => {
    const base = [1.5, 1.6, 0.8];
    const copy = [...base];
    deform(base, { stretch: 1.1, swayX: 0.1, swayZ: 0.1, glow: 1 }, CONFIG, 4);
    expect(base).toEqual(copy);
  });
});

const PALETTE: FlamePalette = { core: [1, 0.9, 0.5], mid: [1, 0.5, 0.1], edge: [0.9, 0.2, 0] };
const COLOR_CONFIG: FlameColorConfig = { facingWeight: 1.2, heightCooling: 0.6 };

/** 정점 하나(위치·법선)의 색. 카메라는 +z 쪽 멀리 */
function colorOf(position: number[], normal: number[], glow = 1, camera = [1, 1, 50]) {
  const out = new Float32Array(3);
  writeFlameColors(
    position,
    normal,
    out,
    SHAPE,
    camera[0],
    camera[1],
    camera[2],
    PALETTE,
    COLOR_CONFIG,
    glow,
  );
  return Array.from(out);
}

describe("getFlameHeat", () => {
  it("정면·아래쪽일수록 뜨겁고 0~1 범위다", () => {
    expect(getFlameHeat(1, 0, COLOR_CONFIG)).toBe(1);
    expect(getFlameHeat(0, 0, COLOR_CONFIG)).toBe(0);
    expect(getFlameHeat(1, 1, COLOR_CONFIG)).toBeLessThan(getFlameHeat(1, 0.3, COLOR_CONFIG));
    expect(getFlameHeat(0.6, 0.5, COLOR_CONFIG)).toBeLessThan(getFlameHeat(0.9, 0.5, COLOR_CONFIG));
  });

  it("범위 밖 입력(뒷면 음수 정면도, 바닥 아래·꼭대기 위)은 잘라서 계산한다", () => {
    expect(getFlameHeat(-0.8, 0.2, COLOR_CONFIG)).toBe(0);
    expect(getFlameHeat(1, -2, COLOR_CONFIG)).toBe(getFlameHeat(1, 0, COLOR_CONFIG));
    expect(getFlameHeat(1, 3, COLOR_CONFIG)).toBe(getFlameHeat(1, 1, COLOR_CONFIG));
  });
});

describe("writeFlameColors", () => {
  it("카메라를 정면으로 보는 아래쪽 가운데는 core, 실루엣 가장자리는 edge 색이다", () => {
    const center = colorOf([1, 0.8, 1.3], [0, 0, 1]);
    center.forEach((value, i) => expect(value).toBeCloseTo(PALETTE.core[i], 5));
    const silhouette = colorOf([1.3, 0.8, 1], [1, 0, 0]);
    silhouette.forEach((value, i) => expect(value).toBeCloseTo(PALETTE.edge[i], 2));
  });

  it("같은 방향을 봐도 위쪽 끝은 아래보다 덜 노랗다 (초록 성분이 작다)", () => {
    const low = colorOf([1, 0.9, 1.3], [0, 0, 1]);
    const high = colorOf([1, 1.95, 1.3], [0, 0, 1]);
    expect(high[1]).toBeLessThan(low[1]);
  });

  it("카메라 위치가 바뀌면 그쪽을 보는 면이 뜨거워진다", () => {
    const sideNormal = [1, 0, 0];
    const fromFront = colorOf([1.3, 0.8, 1], sideNormal, 1, [1, 1, 50]);
    const fromSide = colorOf([1.3, 0.8, 1], sideNormal, 1, [50, 1, 1]);
    expect(fromSide[1]).toBeGreaterThan(fromFront[1]);
  });

  it("일렁임 밝기를 곱하고, 입력 배열을 바꾸지 않는다", () => {
    const base = colorOf([1, 0.8, 1.3], [0, 0, 1], 1);
    const bright = colorOf([1, 0.8, 1.3], [0, 0, 1], 1.1);
    bright.forEach((value, i) => expect(value).toBeCloseTo(base[i] * 1.1, 5));

    const positions = [1, 0.8, 1.3, 1.3, 1.5, 1];
    const normals = [0, 0, 1, 1, 0, 0];
    const out = new Float32Array(6);
    writeFlameColors(positions, normals, out, SHAPE, 1, 1, 50, PALETTE, COLOR_CONFIG, 1);
    expect(positions).toEqual([1, 0.8, 1.3, 1.3, 1.5, 1]);
    expect(normals).toEqual([0, 0, 1, 1, 0, 0]);
    // 두 정점 모두 썼다 (빨강 성분은 모든 단계 색에서 0보다 크다)
    expect(out[0]).toBeGreaterThan(0);
    expect(out[3]).toBeGreaterThan(0);
  });
});
