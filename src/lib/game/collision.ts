// XZ 평면 충돌과 축별 이동 해석 (SPEC §3). 플레이어는 원, 장애물은 원 또는 축 정렬 사각형이다.

import { canStandOnTerrain, canStep, getTerrainHeight } from "./terrain";
import type { Heightfield } from "./terrain";
import type { Bounds2D, Collider } from "./worldConfig";

/** 원(중심 x, z, 반지름 r)이 장애물과 겹치는가. 경계에 정확히 닿는 것은 겹침이 아니다 */
export function circleOverlapsCollider(
  x: number,
  z: number,
  radius: number,
  collider: Collider,
): boolean {
  if (collider.kind === "circle") {
    const dx = x - collider.x;
    const dz = z - collider.z;
    const reach = radius + collider.radius;
    return dx * dx + dz * dz < reach * reach;
  }
  // 원 중심에서 사각형 위 가장 가까운 점까지의 거리 < 반지름
  const nearestX = Math.min(Math.max(x, collider.minX), collider.maxX);
  const nearestZ = Math.min(Math.max(z, collider.minZ), collider.maxZ);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

/** 원이 범위 안에 완전히 들어가는가 */
export function isCircleInsideBounds(
  x: number,
  z: number,
  radius: number,
  bounds: Bounds2D,
): boolean {
  return (
    x - radius >= bounds.minX &&
    x + radius <= bounds.maxX &&
    z - radius >= bounds.minZ &&
    z + radius <= bounds.maxZ
  );
}

export interface MoveWorld {
  terrain: Heightfield;
  bounds: Bounds2D;
  colliders: readonly Collider[];
  radius: number;
  maxStepHeight: number;
  maxSlope: number;
}

export interface GroundPosition {
  x: number;
  y: number;
  z: number;
}

/** 원이 (x, z)에 있을 수 있는가: 이동 범위 안 + 바닥 위 + 장애물과 겹치지 않음 */
export function canOccupy(x: number, z: number, world: MoveWorld): boolean {
  if (!isCircleInsideBounds(x, z, world.radius, world.bounds)) return false;
  if (!canStandOnTerrain(world.terrain, x, z, world.radius)) return false;
  return !world.colliders.some((collider) => circleOverlapsCollider(x, z, world.radius, collider));
}

/** 한 축 방향 이동을 시도한다. 갈 수 없으면 null */
function tryStep(
  from: GroundPosition,
  toX: number,
  toZ: number,
  world: MoveWorld,
): GroundPosition | null {
  if (!canOccupy(toX, toZ, world)) return null;
  const toY = getTerrainHeight(world.terrain, toX, toZ);
  if (toY === null) return null;
  const distance = Math.hypot(toX - from.x, toZ - from.z);
  if (!canStep(from.y, toY, distance, world.maxStepHeight, world.maxSlope)) return null;
  return { x: toX, y: toY, z: toZ };
}

/**
 * from에서 (dx, dz)만큼 이동한 결과. **X축과 Z축을 따로** 시도해서, 막힌 축만 취소한다.
 * 그래서 벽이나 장애물에 비스듬히 부딪혀도 막히지 않은 방향으로 미끄러진다 (SPEC §3 [결정]).
 * 결과의 y는 도착 지점의 바닥 높이다.
 *
 * 한 번의 이동량이 장애물 지름보다 작다고 가정한다. 호출하는 쪽이 delta 상한(0.1초)으로 이를 보장한다.
 */
export function resolveMove(
  from: GroundPosition,
  dx: number,
  dz: number,
  world: MoveWorld,
): GroundPosition {
  let current = from;
  if (dx !== 0) current = tryStep(current, current.x + dx, current.z, world) ?? current;
  if (dz !== 0) current = tryStep(current, current.x, current.z + dz, world) ?? current;
  return current;
}
