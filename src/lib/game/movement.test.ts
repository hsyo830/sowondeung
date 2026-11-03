import { describe, expect, it } from "vitest";

import {
  dampAngle,
  getDampFactor,
  getMoveDirection,
  getYawFromDirection,
  isMovementKey,
} from "./movement";

describe("getMoveDirection", () => {
  it("월드 기준 방향: W = -z, S = +z, A = -x, D = +x", () => {
    expect(getMoveDirection(new Set(["KeyW"]))).toEqual({ x: 0, z: -1 });
    expect(getMoveDirection(new Set(["KeyS"]))).toEqual({ x: 0, z: 1 });
    expect(getMoveDirection(new Set(["KeyA"]))).toEqual({ x: -1, z: 0 });
    expect(getMoveDirection(new Set(["KeyD"]))).toEqual({ x: 1, z: 0 });
  });

  it("방향키도 같은 방향이다", () => {
    expect(getMoveDirection(new Set(["ArrowUp"]))).toEqual({ x: 0, z: -1 });
    expect(getMoveDirection(new Set(["ArrowRight"]))).toEqual({ x: 1, z: 0 });
  });

  it("대각선도 길이가 1이다", () => {
    const { x, z } = getMoveDirection(new Set(["KeyW", "KeyD"]));
    expect(Math.hypot(x, z)).toBeCloseTo(1);
    expect(x).toBeGreaterThan(0);
    expect(z).toBeLessThan(0);
  });

  it("같은 방향 키 두 개는 더 빨라지지 않고, 반대 방향은 상쇄된다", () => {
    expect(getMoveDirection(new Set(["KeyW", "ArrowUp"]))).toEqual({ x: 0, z: -1 });
    expect(getMoveDirection(new Set(["KeyW", "KeyS"]))).toEqual({ x: 0, z: 0 });
  });

  it("이동키가 아닌 키는 무시한다", () => {
    expect(getMoveDirection(new Set(["KeyE", "Space"]))).toEqual({ x: 0, z: 0 });
    expect(isMovementKey("KeyE")).toBe(false);
    expect(isMovementKey("ArrowLeft")).toBe(true);
  });
});

describe("getYawFromDirection", () => {
  it("모델은 회전 0일 때 +z를 바라본다", () => {
    expect(getYawFromDirection(0, 1)).toBeCloseTo(0);
    expect(getYawFromDirection(1, 0)).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(getYawFromDirection(0, -1))).toBeCloseTo(Math.PI);
  });
});

describe("getDampFactor", () => {
  it("프레임을 나눠도 같은 시간이면 같은 만큼 따라간다", () => {
    const once = getDampFactor(6, 0.1);
    const half = getDampFactor(6, 0.05);
    const twice = 1 - (1 - half) * (1 - half);
    expect(twice).toBeCloseTo(once);
  });
});

describe("dampAngle", () => {
  it("목표 쪽으로 다가간다", () => {
    const next = dampAngle(0, 1, 10, 0.016);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
  });

  it("-π ~ π 경계를 넘을 때 가까운 방향으로 돈다", () => {
    // 170° → -170°: 340° 돌지 않고 +20° 방향으로 간다
    const from = (170 * Math.PI) / 180;
    const to = (-170 * Math.PI) / 180;
    expect(dampAngle(from, to, 10, 0.016)).toBeGreaterThan(from);
  });
});
