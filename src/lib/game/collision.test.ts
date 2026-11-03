import { describe, expect, it } from "vitest";

import { canOccupy, circleOverlapsCollider, isCircleInsideBounds, resolveMove } from "./collision";
import type { MoveWorld } from "./collision";
import { clampDelta } from "./flight";
import { createHeightfield } from "./terrain";
import {
  COLLIDERS,
  PLAYER_CONFIG,
  TERRAIN_CONFIG,
  WALK_BOUNDS,
  type BoxCollider,
  type CircleCollider,
} from "./worldConfig";

const RADIUS = 0.4;
const BOX: BoxCollider = { kind: "box", id: "box", minX: 2, maxX: 4, minZ: -1, maxZ: 1 };
const TREE: CircleCollider = { kind: "circle", id: "tree", x: 0, z: -3, radius: 0.5 };
const FLAT = createHeightfield({ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }, 0.5, () => 0);

function makeWorld(overrides: Partial<MoveWorld> = {}): MoveWorld {
  return {
    terrain: FLAT,
    bounds: { minX: -8, maxX: 8, minZ: -8, maxZ: 8 },
    colliders: [BOX, TREE],
    radius: RADIUS,
    maxStepHeight: 0.3,
    maxSlope: 0.9,
    ...overrides,
  };
}

describe("circleOverlapsCollider", () => {
  it("원-원: 반지름 합보다 가까우면 겹치고, 멀면 겹치지 않는다", () => {
    expect(circleOverlapsCollider(0, -2.2, RADIUS, TREE)).toBe(true);
    expect(circleOverlapsCollider(0, -2.09, RADIUS, TREE)).toBe(false);
  });

  it("원-사각형: 변·모서리까지의 거리로 판정한다", () => {
    expect(circleOverlapsCollider(1.7, 0, RADIUS, BOX)).toBe(true);
    expect(circleOverlapsCollider(1.59, 0, RADIUS, BOX)).toBe(false);
    // 모서리 (2, 1)에서 대각선으로 0.3 떨어진 점은 겹치고, 0.5 떨어진 점은 겹치지 않는다
    expect(circleOverlapsCollider(2 - 0.3 / Math.SQRT2, 1 + 0.3 / Math.SQRT2, RADIUS, BOX)).toBe(
      true,
    );
    expect(circleOverlapsCollider(2 - 0.5 / Math.SQRT2, 1 + 0.5 / Math.SQRT2, RADIUS, BOX)).toBe(
      false,
    );
  });

  it("원 중심이 사각형 안에 있으면 겹친다", () => {
    expect(circleOverlapsCollider(3, 0, RADIUS, BOX)).toBe(true);
  });
});

describe("isCircleInsideBounds", () => {
  it("원 전체가 범위 안이어야 한다", () => {
    const bounds = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };
    expect(isCircleInsideBounds(0.4, 5, RADIUS, bounds)).toBe(true);
    expect(isCircleInsideBounds(0.39, 5, RADIUS, bounds)).toBe(false);
    expect(isCircleInsideBounds(5, 9.7, RADIUS, bounds)).toBe(false);
  });
});

describe("resolveMove", () => {
  const start = { x: 0, y: 0, z: 0 };

  it("막힌 것이 없으면 그대로 이동하고, y는 바닥 높이를 따른다", () => {
    const slope = createHeightfield(
      { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
      0.5,
      (x) => x * 0.1,
    );
    const result = resolveMove(start, 0.2, 0.1, makeWorld({ terrain: slope }));
    expect(result.x).toBeCloseTo(0.2);
    expect(result.z).toBeCloseTo(0.1);
    expect(result.y).toBeCloseTo(0.02);
  });

  it("장애물을 통과하지 못한다", () => {
    const world = makeWorld();
    let position = { x: 0, y: 0, z: 0 };
    // +x로 계속 밀어도 사각형(minX 2) 앞에서 멈춘다
    for (let i = 0; i < 100; i++) position = resolveMove(position, 0.1, 0, world);
    expect(position.x).toBeLessThanOrEqual(BOX.minX - RADIUS);
    expect(position.x).toBeGreaterThan(BOX.minX - RADIUS - 0.1);
  });

  it("비스듬히 부딪히면 막히지 않은 축으로 미끄러진다", () => {
    const world = makeWorld();
    // 사각형 바로 앞. 정확히 닿는 값은 부동소수점 오차로 겹침이 될 수 있어 0.01 띄운다
    const touching = { x: BOX.minX - RADIUS - 0.01, y: 0, z: 0 };
    const result = resolveMove(touching, 0.1, 0.1, world);
    expect(result.x).toBe(touching.x);
    expect(result.z).toBeCloseTo(0.1);
  });

  it("사각형 모서리를 돌아 나갈 수 있다", () => {
    const world = makeWorld();
    let position = { x: BOX.minX - RADIUS - 0.01, y: 0, z: 0.5 };
    for (let i = 0; i < 20; i++) position = resolveMove(position, 0.1, 0.1, world);
    expect(position.z).toBeGreaterThan(BOX.maxZ + RADIUS);
    expect(position.x).toBeGreaterThan(BOX.minX);
  });

  it("delta 상한을 적용하면 아주 큰 delta에서도 얇은 장애물을 뚫지 않는다", () => {
    const world = makeWorld();
    const speed = PLAYER_CONFIG.speed;
    // 탭 복귀 직후 delta 5초 → 상한 0.1초 → 이동량 0.35
    const step = speed * clampDelta(5);
    const beforeTree = { x: 0, y: 0, z: TREE.z + TREE.radius + RADIUS + 0.01 };
    const result = resolveMove(beforeTree, 0, -step, world);
    expect(result.z).toBe(beforeTree.z);
  });

  it("이동 범위 밖으로 나가지 못한다", () => {
    const world = makeWorld();
    let position = { x: 0, y: 0, z: 5 };
    for (let i = 0; i < 100; i++) position = resolveMove(position, 0, 0.1, world);
    expect(position.z + RADIUS).toBeLessThanOrEqual(8);
  });

  it("바닥이 없는 곳(허공)으로 나가지 못한다", () => {
    // x > 3에는 바닥이 없다
    const cliff = createHeightfield({ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }, 0.5, (x) =>
      x > 3 ? null : 0,
    );
    const world = makeWorld({ terrain: cliff, colliders: [] });
    let position = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 100; i++) position = resolveMove(position, 0.1, 0, world);
    expect(position.x + RADIUS).toBeLessThanOrEqual(3);
  });

  it("급경사·높은 단차는 넘지 못한다", () => {
    // x >= 2부터 바닥이 1만큼 높다 (격자 사이에서 경사 2 = 63°)
    const step = createHeightfield({ minX: -10, maxX: 10, minZ: -10, maxZ: 10 }, 0.5, (x) =>
      x >= 2 ? 1 : 0,
    );
    const world = makeWorld({ terrain: step, colliders: [] });
    let position = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < 100; i++) position = resolveMove(position, 0.05, 0, world);
    expect(position.x).toBeLessThan(2);
    expect(position.y).toBeLessThan(0.3);
  });
});

describe("WorldConfig 값 검증", () => {
  const world = makeWorld({
    terrain: createHeightfield(TERRAIN_CONFIG.bounds, TERRAIN_CONFIG.cellSize, () => 0.7),
    bounds: WALK_BOUNDS,
    colliders: COLLIDERS,
    radius: PLAYER_CONFIG.radius,
  });

  it("시작 위치는 이동 가능한 곳이다", () => {
    expect(canOccupy(PLAYER_CONFIG.start.x, PLAYER_CONFIG.start.z, world)).toBe(true);
  });

  it("이동 범위는 바닥 메시 범위 안에 있다", () => {
    expect(WALK_BOUNDS.minX).toBeGreaterThanOrEqual(TERRAIN_CONFIG.bounds.minX);
    expect(WALK_BOUNDS.maxX).toBeLessThanOrEqual(TERRAIN_CONFIG.bounds.maxX);
    expect(WALK_BOUNDS.minZ).toBeGreaterThanOrEqual(TERRAIN_CONFIG.bounds.minZ);
    expect(WALK_BOUNDS.maxZ).toBeLessThanOrEqual(TERRAIN_CONFIG.bounds.maxZ);
  });

  it("테이블: 머리가 상판에 겹치던 위치(기존 상자 경계 바로 밖)에는 설 수 없다", () => {
    // 상판 동쪽 끝 x -2.56, 북쪽 끝 z -0.82 (머리 높이 단면). 머리 반지름 0.70
    expect(canOccupy(-2.56 + 0.69, 1.4, world)).toBe(false);
    expect(canOccupy(-3.5, -0.82 - 0.69, world)).toBe(false);
    expect(canOccupy(-2.56 + 0.71 + 0.02, 1.4, world)).toBe(true);
  });

  it("테이블과 모닥불 사이 통로는 지나갈 수 있다", () => {
    expect(canOccupy(-1.7, 1.1, world)).toBe(true);
  });

  it("충돌 영역 id는 겹치지 않는다", () => {
    const ids = COLLIDERS.map((collider) => collider.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
