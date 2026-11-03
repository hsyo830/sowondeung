import { describe, expect, it } from "vitest";

import { ATMOSPHERE_CONFIG, CAMERA_CONFIG, TERRAIN_CONFIG, WALK_BOUNDS } from "./worldConfig";
import {
  getBackdropJunctionY,
  getGroundEdgeViewDepth,
  getSkyBackdropColor,
  interpolateMonotone,
  linearRgbToOklab,
  mixRgb,
  oklabToLinearRgb,
} from "./sky";
import type { Rgb, SkyStop } from "./sky";

// 게임 설정처럼 아래(밝은 분홍) → 위(어두운 남보라)로 갈수록 어두워지는 단계 (선형 RGB)
const STOPS: SkyStop[] = [
  { y: 1, color: [0.75, 0.4, 0.62] },
  { y: 1.5, color: [0.55, 0.36, 0.72], glowColor: [0.66, 0.37, 0.66] },
  { y: 2.2, color: [0.33, 0.23, 0.72] },
  { y: 3.2, color: [0.15, 0.1, 0.65] },
  { y: 8, color: [0.05, 0.04, 0.42] },
];
const GLOW = { x: 0, z: -1 };

function expectRgbClose(actual: Rgb, expected: Rgb, digits = 6) {
  actual.forEach((value, i) => expect(value).toBeCloseTo(expected[i], digits));
}

const lightness = (y: number, dirZ = 1) =>
  linearRgbToOklab(getSkyBackdropColor(y, 0, dirZ, STOPS, GLOW))[0];

describe("mixRgb", () => {
  it("t를 0~1로 자르고 선형 보간한다", () => {
    expectRgbClose(mixRgb([0, 0, 0], [1, 1, 1], 0.25), [0.25, 0.25, 0.25]);
    expectRgbClose(mixRgb([0, 0, 0], [1, 1, 1], 2), [1, 1, 1]);
    expectRgbClose(mixRgb([0, 0, 0], [1, 1, 1], -1), [0, 0, 0]);
  });
});

describe("OKLab 변환", () => {
  it("선형 RGB → OKLab → 선형 RGB가 원래 색으로 돌아온다", () => {
    for (const color of [
      [0.75, 0.4, 0.62],
      [0.05, 0.04, 0.42],
      [1, 1, 1],
      [0.2, 0.5, 0.1],
    ] as Rgb[]) {
      expectRgbClose(oklabToLinearRgb(linearRgbToOklab(color)), color, 5);
    }
  });

  it("흰색은 밝기 1, 무채색은 a·b가 0이다", () => {
    const [L, a, b] = linearRgbToOklab([1, 1, 1]);
    expect(L).toBeCloseTo(1, 4);
    expect(a).toBeCloseTo(0, 4);
    expect(b).toBeCloseTo(0, 4);
  });
});

describe("interpolateMonotone (단조 3차 보간)", () => {
  const xs = [0, 1, 3, 4];
  const ys = [1, 0.8, 0.2, 0];

  it("각 점을 정확히 지나고, 범위 밖은 끝 값이다", () => {
    xs.forEach((x, i) => expect(interpolateMonotone(xs, ys, x)).toBeCloseTo(ys[i], 10));
    expect(interpolateMonotone(xs, ys, -5)).toBe(1);
    expect(interpolateMonotone(xs, ys, 9)).toBe(0);
  });

  it("단조로운 점들 사이에서 넘치거나 되돌아가지 않는다", () => {
    let previous = Infinity;
    for (let x = 0; x <= 4; x += 0.01) {
      const value = interpolateMonotone(xs, ys, x);
      expect(value).toBeLessThanOrEqual(previous + 1e-12);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
  });

  it("안쪽 점에서 기울기가 끊기지 않고 0도 아니다 (점마다 평평한 띠가 생기지 않음)", () => {
    const e = 1e-4;
    for (const x of [1, 3]) {
      const left = (interpolateMonotone(xs, ys, x) - interpolateMonotone(xs, ys, x - e)) / e;
      const right = (interpolateMonotone(xs, ys, x + e) - interpolateMonotone(xs, ys, x)) / e;
      expect(Math.abs(left - right)).toBeLessThan(0.01);
      expect(Math.abs(left)).toBeGreaterThan(0.1);
    }
  });

  it("양 끝 기울기는 0이다 (범위 밖 평평한 값과 꺾임 없이 이어진다)", () => {
    const e = 1e-3;
    expect(Math.abs((interpolateMonotone(xs, ys, e) - ys[0]) / e)).toBeLessThan(0.01);
    expect(Math.abs((ys[3] - interpolateMonotone(xs, ys, 4 - e)) / e)).toBeLessThan(0.01);
  });
});

describe("getSkyBackdropColor", () => {
  it("첫 단계 이하는 방향과 상관없이 정확히 첫 단계 색(= 안개색)이다", () => {
    for (const [x, z] of [
      [0, -1],
      [1, 0],
      [0, 1],
    ]) {
      expect(getSkyBackdropColor(STOPS[0].y, x, z, STOPS, GLOW)).toBe(STOPS[0].color);
      expect(getSkyBackdropColor(-5, x, z, STOPS, GLOW)).toBe(STOPS[0].color);
    }
  });

  it("안개 단색 면과 만나는 곳에 접합선이 없다 (첫 단계 바로 위는 거의 같은 색)", () => {
    const justAbove = getSkyBackdropColor(STOPS[0].y + 0.01, 0, 1, STOPS, GLOW);
    expectRgbClose(justAbove, STOPS[0].color, 3);
  });

  it("각 단계 높이에서 그 색이 나온다. 노을 단계는 노을 쪽이 glowColor, 반대쪽이 color", () => {
    expectRgbClose(getSkyBackdropColor(2.2, 1, 0, STOPS, GLOW), STOPS[2].color, 5);
    expectRgbClose(getSkyBackdropColor(3.2, 0, 1, STOPS, GLOW), STOPS[3].color, 5);
    expectRgbClose(getSkyBackdropColor(1.5, 0, -1, STOPS, GLOW), STOPS[1].glowColor!, 5);
    expectRgbClose(getSkyBackdropColor(1.5, 0, 1, STOPS, GLOW), STOPS[1].color, 5);
  });

  it("맨 위 단계 이상은 그 색이다", () => {
    expectRgbClose(getSkyBackdropColor(8, 0, -1, STOPS, GLOW), STOPS[4].color, 5);
    expect(getSkyBackdropColor(50, 0, 1, STOPS, GLOW)).toBe(STOPS[4].color);
  });

  it("위로 갈수록 밝기가 단조롭게 줄어든다 (중간에 밝아지거나 평평한 띠가 없다)", () => {
    for (const dirZ of [-1, 1]) {
      for (let y = 1.01; y < 7.99; y += 0.01) {
        expect(lightness(y + 0.01, dirZ)).toBeLessThan(lightness(y, dirZ));
      }
    }
  });

  it("높이에 따라 끊기지 않고 이어진다 (단계 경계에서도 색이 튀지 않음)", () => {
    for (let y = 0.5; y < 9; y += 0.01) {
      const a = getSkyBackdropColor(y, 0.6, -0.8, STOPS, GLOW);
      const b = getSkyBackdropColor(y + 0.01, 0.6, -0.8, STOPS, GLOW);
      a.forEach((value, i) => expect(Math.abs(value - b[i])).toBeLessThan(0.01));
    }
  });
});

describe("getBackdropJunctionY", () => {
  it("원판 가장자리를 스치는 시선이 배경막에 닿는 높이", () => {
    // 카메라 y 5, 바닥 1, 원판 40, 배경막 80 → 기울기 4/40 → 80에서 8 내려간 −3
    expect(getBackdropJunctionY(5, 1, 40, 80)).toBeCloseTo(-3, 10);
    // 원판과 배경막이 같은 거리면 바닥 높이에서 만난다
    expect(getBackdropJunctionY(5, 1, 80, 80)).toBeCloseTo(1, 10);
  });
});

describe("하늘·바닥 이음새 조건 (게임 설정값)", () => {
  const { skyBackdrop, fogColor, fogFar } = ATMOSPHERE_CONFIG;
  const cameraHeight = CAMERA_CONFIG.offset[1];

  it("안개색 = 배경막 첫 단계 색", () => {
    expect(skyBackdrop.stops[0].color).toBe(fogColor);
  });

  it("바닥 원판은 안개가 완전히 덮는 거리보다 바깥에서 끝난다", () => {
    expect(TERRAIN_CONFIG.farGroundRadius).toBeGreaterThanOrEqual(fogFar);
  });

  it("3인칭 카메라 높이 범위에서 바닥 끝이 배경막의 안개색 구간(첫 단계 아래)에 닿는다", () => {
    // 바닥 높이 0.60~0.83 위의 캐릭터 + 카메라 오프셋
    for (const playerY of [0.6, 0.7, 0.83]) {
      const junction = getBackdropJunctionY(
        playerY + cameraHeight,
        TERRAIN_CONFIG.extensionY,
        TERRAIN_CONFIG.farGroundRadius,
        skyBackdrop.radius,
      );
      expect(junction).toBeLessThanOrEqual(skyBackdrop.stops[0].y);
      expect(junction).toBeGreaterThan(skyBackdrop.bottomY);
    }
  });

  it("바닥 원판 가장자리는 16:9 화면 옆 끝에서도 안개가 완전히 덮는 깊이다 (초록·하늘 경계선 없음)", () => {
    const [, offsetY, offsetZ] = CAMERA_CONFIG.offset;
    const pitch = Math.atan((offsetY - CAMERA_CONFIG.lookAtOffset[1]) / offsetZ);
    const halfVertical = ((CAMERA_CONFIG.fov / 2) * Math.PI) / 180;
    for (const aspect of [16 / 10, 16 / 9]) {
      const halfHorizontal = Math.atan(Math.tan(halfVertical) * aspect);
      const depth = getGroundEdgeViewDepth(
        TERRAIN_CONFIG.farGroundRadius,
        cameraHeight + 0.6 - TERRAIN_CONFIG.extensionY,
        pitch,
        halfHorizontal,
      );
      expect(depth).toBeGreaterThanOrEqual(fogFar);
    }
  });

  it("섬 바깥 띠는 어느 이동 위치에서도 바닥 원판 안에서 끝난다 (하늘 앞에 띠 조각이 생기지 않음)", () => {
    const { minX, maxX, minZ, maxZ } = TERRAIN_CONFIG.bounds;
    const outer = TERRAIN_CONFIG.edgeCoverWidth;
    const corners = [
      [minX - outer, minZ - outer],
      [maxX + outer, minZ - outer],
      [minX - outer, maxZ + outer],
      [maxX + outer, maxZ + outer],
    ];
    const cameras = [
      [WALK_BOUNDS.minX, WALK_BOUNDS.minZ],
      [WALK_BOUNDS.maxX, WALK_BOUNDS.minZ],
      [WALK_BOUNDS.minX, WALK_BOUNDS.maxZ],
      [WALK_BOUNDS.maxX, WALK_BOUNDS.maxZ],
    ].map(([x, z]) => [x + CAMERA_CONFIG.offset[0], z + CAMERA_CONFIG.offset[2]]);
    for (const [cx, cz] of cameras) {
      for (const [x, z] of corners) {
        expect(Math.hypot(x - cx, z - cz)).toBeLessThan(TERRAIN_CONFIG.farGroundRadius);
      }
    }
  });
});
