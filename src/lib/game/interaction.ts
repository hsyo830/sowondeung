// 근접 상호작용 판정 (SPEC §8). 버튼 표시(매 프레임)와 실행(클릭·E키) 모두 resolveInteraction 하나를 쓴다.
// 그래서 '보이는데 실행 안 됨'이나 '안 보이는데 실행됨'이 생기지 않는다. 모두 순수 함수다.

import type {
  GameMode,
  InteractionActionId,
  InteractionId,
  LanternStatus,
  PlayerState,
} from "@/types/game";

import { TABLE_COLLIDER } from "./worldConfig";
import type { Bounds2D, Collider } from "./worldConfig";

export interface InteractionTarget {
  id: InteractionId;
  /** WorldConfig의 충돌 영역을 그대로 참조한다 (SPEC §8) */
  shape: Collider;
  /** 현재 천등 상태에서 가능한 액션. 첫 번째가 E키로 실행되는 주 액션이다. 비어 있으면 상호작용할 수 없다 */
  getActionIds: (status: LanternStatus) => readonly InteractionActionId[];
}

export interface InteractionRules {
  /** 플레이어 충돌 원 반지름 */
  playerRadius: number;
  /** 시작 거리 (원 표면 ~ 대상 표면) */
  reach: number;
  /** 유지 거리. reach 이상이어야 한다 */
  keepReach: number;
  /** 시작 방향 기준 (바라보는 방향과 대상 방향 사이 각도의 cos) */
  facingCos: number;
  /** 유지 방향 기준. facingCos 이하여야 한다 */
  keepFacingCos: number;
}

export interface InteractionContext {
  mode: GameMode;
  status: LanternStatus;
}

/** 판정에 필요한 플레이어 값만 받는다. 바라보는 방향은 입력이 정한 targetYaw다 (모델의 보간 중 회전이 아님) */
export type InteractionPose = Pick<PlayerState, "x" | "z" | "targetYaw">;

export interface ResolvedInteraction {
  id: InteractionId;
  actionIds: readonly InteractionActionId[];
  /** 원 표면 ~ 대상 표면 거리 */
  gap: number;
}

/** SPEC §6 테이블 상태별 버튼. LIT에서는 테이블 상호작용이 없다 */
export function getTableActionIds(status: LanternStatus): readonly InteractionActionId[] {
  switch (status) {
    case "NONE":
      return ["receiveLantern"];
    case "BLANK":
      return ["writeWish", "reselectColor"];
    case "WRITTEN":
      return ["editWish"];
    case "LIT":
      return [];
  }
}

/**
 * 3단계 상호작용 대상: 테이블만. 모닥불(점화)은 4단계에서 추가한다.
 * 그래서 NONE·BLANK에서 모닥불을 바라봐도 강조·버튼이 나타나지 않는다.
 */
export const INTERACTION_TARGETS: readonly InteractionTarget[] = [
  { id: "table", shape: TABLE_COLLIDER, getActionIds: getTableActionIds },
];

/** 충돌 영역 위에서 (x, z)에 가장 가까운 점. 영역 안이면 원은 중심, 사각형은 그 점 자신이다 */
export function getClosestPointOnCollider(
  x: number,
  z: number,
  collider: Collider,
): { x: number; z: number } {
  if (collider.kind === "box") return clampToBounds(x, z, collider);
  const dx = x - collider.x;
  const dz = z - collider.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= collider.radius) return { x, z };
  const ratio = collider.radius / distance;
  return { x: collider.x + dx * ratio, z: collider.z + dz * ratio };
}

/** 사각형 범위 안으로 점을 가둔다 */
export function clampToBounds(x: number, z: number, bounds: Bounds2D): { x: number; z: number } {
  return {
    x: Math.min(Math.max(x, bounds.minX), bounds.maxX),
    z: Math.min(Math.max(z, bounds.minZ), bounds.maxZ),
  };
}

/** 플레이어 원 표면에서 대상 표면까지의 XZ 거리. 겹치면 0 */
export function getSurfaceGap(x: number, z: number, radius: number, collider: Collider): number {
  const closest = getClosestPointOnCollider(x, z, collider);
  return Math.max(0, Math.hypot(closest.x - x, closest.z - z) - radius);
}

/**
 * 바라보는 방향(yaw)과 (x, z) → (targetX, targetZ) 방향 사이 각도의 cos. 1 = 정면, 0 = 옆, -1 = 등 뒤.
 * yaw 0 = +z를 바라본다 (movement.ts getYawFromDirection과 같은 규칙). 두 점이 같으면 1(정면)로 본다.
 */
export function getFacingCos(
  x: number,
  z: number,
  yaw: number,
  targetX: number,
  targetZ: number,
): number {
  const dx = targetX - x;
  const dz = targetZ - z;
  const distance = Math.hypot(dx, dz);
  if (distance === 0) return 1;
  return (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / distance;
}

/**
 * 지금 상호작용할 수 있는 대상 하나와 그 액션 목록. 없으면 null.
 *
 * 조건 (모두 만족해야 한다):
 * 1. 모드가 EXPLORE (색상 선택·작성 UI가 열려 있지 않음)
 * 2. 현재 천등 상태에서 그 대상에 가능한 액션이 1개 이상
 * 3. 플레이어 원 표면 ~ 대상 표면 거리 ≤ reach
 * 4. 플레이어가 대상(표면의 가장 가까운 점)을 바라봄: cos ≥ facingCos
 *
 * currentId(지금 표시 중인 대상)는 3·4번에 keepReach·keepFacingCos를 쓴다 (히스테리시스).
 * 여러 대상이 조건을 만족하면 표면까지 가장 가까운 하나만 돌려준다 (SPEC §8).
 */
export function resolveInteraction(
  targets: readonly InteractionTarget[],
  pose: InteractionPose,
  context: InteractionContext,
  rules: InteractionRules,
  currentId: InteractionId | null,
): ResolvedInteraction | null {
  if (context.mode !== "EXPLORE") return null;

  let best: ResolvedInteraction | null = null;
  for (const target of targets) {
    const actionIds = target.getActionIds(context.status);
    if (actionIds.length === 0) continue;

    const isCurrent = target.id === currentId;
    const gap = getSurfaceGap(pose.x, pose.z, rules.playerRadius, target.shape);
    if (gap > (isCurrent ? rules.keepReach : rules.reach)) continue;

    const closest = getClosestPointOnCollider(pose.x, pose.z, target.shape);
    const facingCos = getFacingCos(pose.x, pose.z, pose.targetYaw, closest.x, closest.z);
    if (facingCos < (isCurrent ? rules.keepFacingCos : rules.facingCos)) continue;

    if (!best || gap < best.gap) best = { id: target.id, actionIds, gap };
  }
  return best;
}
