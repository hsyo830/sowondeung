import { describe, expect, it } from "vitest";

import type { InteractionActionId, LanternStatus } from "@/types/game";

import { circleOverlapsCollider } from "./collision";
import {
  INTERACTION_TARGETS,
  getCampfireActionIds,
  getClosestPointOnCollider,
  getFacingCos,
  getSurfaceGap,
  getTableActionIds,
  resolveInteraction,
} from "./interaction";
import type { InteractionContext, InteractionRules, InteractionTarget } from "./interaction";
import { getYawFromDirection } from "./movement";
import {
  CAMPFIRE_COLLIDER,
  COLLIDERS,
  INTERACTION_CONFIG,
  PLAYER_CONFIG,
  TABLE_COLLIDER,
  WALK_BOUNDS,
  type CircleCollider,
} from "./worldConfig";

const RULES: InteractionRules = {
  playerRadius: PLAYER_CONFIG.radius,
  reach: INTERACTION_CONFIG.reach,
  keepReach: INTERACTION_CONFIG.keepReach,
  facingCos: INTERACTION_CONFIG.facingCos,
  keepFacingCos: INTERACTION_CONFIG.keepFacingCos,
};
const EXPLORE_NONE: InteractionContext = { mode: "EXPLORE", status: "NONE" };

/** 테이블 북쪽 면(z = minZ) 앞, 표면 사이 거리 gap인 위치 */
function northOfTable(gap: number, x = -3.3) {
  return { x, z: TABLE_COLLIDER.minZ - PLAYER_CONFIG.radius - gap };
}
/** +z(테이블 쪽)를 기준으로 deg만큼 돌아선 방향 */
function yawFromSouth(deg: number) {
  return (deg * Math.PI) / 180;
}
const FACING_TABLE_FROM_NORTH = getYawFromDirection(0, 1);

describe("거리·방향 계산", () => {
  it("사각형 표면까지의 거리는 가장 가까운 변·모서리 기준이다", () => {
    expect(getSurfaceGap(-3.3, TABLE_COLLIDER.minZ - 1, 0.4, TABLE_COLLIDER)).toBeCloseTo(0.6);
    // 모서리 대각선 방향
    const corner = getSurfaceGap(
      TABLE_COLLIDER.maxX + 0.3,
      TABLE_COLLIDER.minZ - 0.4,
      0.4,
      TABLE_COLLIDER,
    );
    expect(corner).toBeCloseTo(0.1);
  });

  it("원 표면까지의 거리와 가장 가까운 점", () => {
    const circle: CircleCollider = { kind: "circle", id: "c", x: 0, z: 0, radius: 1 };
    expect(getSurfaceGap(3, 0, 0.4, circle)).toBeCloseTo(1.6);
    expect(getClosestPointOnCollider(0, -3, circle)).toEqual({ x: 0, z: -1 });
  });

  it("겹쳐 있으면 거리는 0이다", () => {
    expect(getSurfaceGap(-3.3, 1, 0.4, TABLE_COLLIDER)).toBe(0);
  });

  it("바라보는 방향 cos: 정면 1, 옆 0, 등 뒤 -1 (yaw 0 = +z)", () => {
    expect(getFacingCos(0, 0, 0, 0, 5)).toBeCloseTo(1);
    expect(getFacingCos(0, 0, Math.PI / 2, 0, 5)).toBeCloseTo(0);
    expect(getFacingCos(0, 0, Math.PI, 0, 5)).toBeCloseTo(-1);
    expect(getFacingCos(0, 0, getYawFromDirection(-1, 0), -5, 0)).toBeCloseTo(1);
  });
});

describe("getTableActionIds — 상태별 테이블 버튼 (SPEC §6)", () => {
  const EXPECTED: [LanternStatus, InteractionActionId[]][] = [
    ["NONE", ["receiveLantern"]],
    ["BLANK", ["writeWish", "reselectColor"]],
    ["WRITTEN", ["editWish"]],
    ["LIT", []],
  ];
  it.each(EXPECTED)("%s → %j", (status, actions) => {
    expect(getTableActionIds(status)).toEqual(actions);
  });
});

describe("resolveInteraction — 테이블", () => {
  function resolve(
    gap: number,
    yaw: number,
    context: InteractionContext = EXPLORE_NONE,
    currentId: "table" | null = null,
  ) {
    const pose = { ...northOfTable(gap), targetYaw: yaw };
    return resolveInteraction(INTERACTION_TARGETS, pose, context, RULES, currentId);
  }

  it("범위 안에서 테이블을 바라보면 상태에 맞는 액션을 돌려준다", () => {
    expect(resolve(0.3, FACING_TABLE_FROM_NORTH)).toMatchObject({
      id: "table",
      actionIds: ["receiveLantern"],
    });
    expect(
      resolve(0.3, FACING_TABLE_FROM_NORTH, { mode: "EXPLORE", status: "BLANK" })?.actionIds,
    ).toEqual(["writeWish", "reselectColor"]);
    expect(
      resolve(0.3, FACING_TABLE_FROM_NORTH, { mode: "EXPLORE", status: "WRITTEN" })?.actionIds,
    ).toEqual(["editWish"]);
  });

  it("거리 경계: reach 바로 안쪽은 포함, 넘으면 없음", () => {
    expect(resolve(RULES.reach - 1e-6, FACING_TABLE_FROM_NORTH)?.id).toBe("table");
    expect(resolve(RULES.reach + 0.01, FACING_TABLE_FROM_NORTH)).toBeNull();
  });

  it("범위 안이어도 테이블을 바라보지 않으면 없다 (등 돌림·옆)", () => {
    expect(resolve(0.3, yawFromSouth(180))).toBeNull();
    expect(resolve(0.3, yawFromSouth(90))).toBeNull();
    expect(resolve(0.3, yawFromSouth(-90))).toBeNull();
  });

  it("방향 경계: 시작은 60° 안, 대각선(45°)은 포함", () => {
    expect(resolve(0.3, yawFromSouth(45))?.id).toBe("table");
    expect(resolve(0.3, yawFromSouth(59))?.id).toBe("table");
    expect(resolve(0.3, yawFromSouth(61))).toBeNull();
  });

  it("히스테리시스: 이미 표시 중이면 조금 멀어지거나 더 돌아서도 유지한다", () => {
    const between = (RULES.reach + RULES.keepReach) / 2;
    expect(resolve(between, FACING_TABLE_FROM_NORTH)).toBeNull();
    expect(resolve(between, FACING_TABLE_FROM_NORTH, EXPLORE_NONE, "table")?.id).toBe("table");
    expect(resolve(0.3, yawFromSouth(70))).toBeNull();
    expect(resolve(0.3, yawFromSouth(70), EXPLORE_NONE, "table")?.id).toBe("table");
  });

  it("히스테리시스 범위도 벗어나면 해제된다", () => {
    expect(
      resolve(RULES.keepReach + 0.01, FACING_TABLE_FROM_NORTH, EXPLORE_NONE, "table"),
    ).toBeNull();
    expect(resolve(0.3, yawFromSouth(80), EXPLORE_NONE, "table")).toBeNull();
  });

  it("EXPLORE가 아닌 모드(다른 UI 진행 중)에서는 없다", () => {
    expect(
      resolve(0.3, FACING_TABLE_FROM_NORTH, { mode: "COLOR_SELECT", status: "NONE" }),
    ).toBeNull();
    expect(
      resolve(0.3, FACING_TABLE_FROM_NORTH, { mode: "WRITING", status: "BLANK" }, "table"),
    ).toBeNull();
  });

  it("LIT에서는 테이블 상호작용이 없다", () => {
    expect(resolve(0.3, FACING_TABLE_FROM_NORTH, { mode: "EXPLORE", status: "LIT" })).toBeNull();
  });

  it("테이블 동쪽 면(빈터 쪽)에서 서쪽을 보면 감지된다", () => {
    const pose = {
      x: TABLE_COLLIDER.maxX + PLAYER_CONFIG.radius + 0.2,
      z: 1.42,
      targetYaw: getYawFromDirection(-1, 0),
    };
    expect(resolveInteraction(INTERACTION_TARGETS, pose, EXPLORE_NONE, RULES, null)?.id).toBe(
      "table",
    );
  });
});

describe("resolveInteraction — 여러 대상", () => {
  const FIRE: CircleCollider = { kind: "circle", id: "fire", x: 0, z: 0, radius: 1 };
  const BOX_FAR: InteractionTarget = {
    id: "table",
    shape: { kind: "box", id: "box", minX: -1, maxX: 1, minZ: 2.5, maxZ: 3 },
    getActionIds: () => ["receiveLantern"],
  };
  const fireWith = (actions: InteractionActionId[]): InteractionTarget => ({
    id: "campfire",
    shape: FIRE,
    getActionIds: () => actions,
  });
  // 두 대상 사이 통로 (z = 1.6): 불(-z 쪽)까지 0.2, 상자(+z 쪽)까지 0.5. 둘 다 reach 안이다
  const pose = { x: 0, z: 1.6, targetYaw: 0 };

  it("통로에서 둘 다 범위 안이면 바라보는 쪽 하나만 돌려준다", () => {
    // +z(상자)를 보면 불은 등 뒤라 제외된다
    const near = resolveInteraction(
      [BOX_FAR, fireWith(["receiveLantern"])],
      pose,
      EXPLORE_NONE,
      RULES,
      null,
    );
    expect(near?.id).toBe("table");

    const facingFire = { ...pose, targetYaw: Math.PI };
    expect(
      resolveInteraction(
        [BOX_FAR, fireWith(["receiveLantern"])],
        facingFire,
        EXPLORE_NONE,
        RULES,
        null,
      )?.id,
    ).toBe("campfire");
  });

  it("같은 방향에 둘 다 있으면 표면까지 더 가까운 하나만 돌려준다", () => {
    const farFire: InteractionTarget = {
      id: "campfire",
      shape: { kind: "circle", id: "f", x: 0, z: 3.1, radius: 0.2 },
      getActionIds: () => ["receiveLantern"],
    };
    const result = resolveInteraction(
      [farFire, BOX_FAR],
      { x: 0, z: 1.9, targetYaw: 0 },
      EXPLORE_NONE,
      RULES,
      null,
    );
    expect(result?.id).toBe("table");
  });

  it("액션이 없는 대상은 더 가까워도 무시한다 (예: 3단계의 모닥불)", () => {
    const facingFire = { ...pose, targetYaw: Math.PI };
    expect(resolveInteraction([fireWith([])], facingFire, EXPLORE_NONE, RULES, null)).toBeNull();
  });

  it("4단계 대상 목록: 테이블과 모닥불. 모닥불 영역은 이동 충돌과 같은 객체다", () => {
    expect(INTERACTION_TARGETS.map((target) => target.id)).toEqual(["table", "campfire"]);
    const campfire = INTERACTION_TARGETS.find((target) => target.id === "campfire");
    expect(campfire?.shape).toBe(CAMPFIRE_COLLIDER);
    expect(COLLIDERS).toContain(CAMPFIRE_COLLIDER);
  });
});

describe("getCampfireActionIds — 모닥불 점화 (SPEC §6 STEP 3)", () => {
  const EXPECTED: [LanternStatus, InteractionActionId[]][] = [
    ["NONE", []],
    ["BLANK", []],
    ["WRITTEN", ["lightLantern"]],
    ["LIT", []],
  ];
  it.each(EXPECTED)("%s → %j", (status, actions) => {
    expect(getCampfireActionIds(status)).toEqual(actions);
  });
});

describe("resolveInteraction — 모닥불 (실제 배치)", () => {
  /** 모닥불 동쪽 빈터, 원 표면까지 gap. 서쪽(-x)을 보면 모닥불 정면이다 */
  function eastOfCampfire(gap: number) {
    return {
      x: CAMPFIRE_COLLIDER.x + CAMPFIRE_COLLIDER.radius + PLAYER_CONFIG.radius + gap,
      z: CAMPFIRE_COLLIDER.z,
    };
  }
  const FACING_WEST = getYawFromDirection(-1, 0);
  const FACING_EAST = getYawFromDirection(1, 0);
  const written: InteractionContext = { mode: "EXPLORE", status: "WRITTEN" };
  const resolve = (
    pose: { x: number; z: number; targetYaw: number },
    context: InteractionContext,
    currentId: "campfire" | null = null,
  ) => resolveInteraction(INTERACTION_TARGETS, pose, context, RULES, currentId);

  it("테스트 위치는 실제로 설 수 있는 곳이다 (장애물과 겹치지 않고 이동 범위 안)", () => {
    const { x, z } = eastOfCampfire(0.3);
    expect(COLLIDERS.some((c) => circleOverlapsCollider(x, z, PLAYER_CONFIG.radius, c))).toBe(
      false,
    );
    expect(x).toBeLessThan(WALK_BOUNDS.maxX);
  });

  it("WRITTEN + 범위 안 + 바라봄 → '불 붙이기'", () => {
    expect(resolve({ ...eastOfCampfire(0.3), targetYaw: FACING_WEST }, written)).toMatchObject({
      id: "campfire",
      actionIds: ["lightLantern"],
    });
  });

  it.each(["NONE", "BLANK", "LIT"] as const)("%s에서는 바라봐도 강조·버튼이 없다", (status) => {
    expect(
      resolve({ ...eastOfCampfire(0.3), targetYaw: FACING_WEST }, { mode: "EXPLORE", status }),
    ).toBeNull();
  });

  it("등을 돌리거나 멀어지면 사라진다", () => {
    expect(resolve({ ...eastOfCampfire(0.3), targetYaw: FACING_EAST }, written)).toBeNull();
    expect(
      resolve({ ...eastOfCampfire(RULES.reach + 0.01), targetYaw: FACING_WEST }, written),
    ).toBeNull();
  });

  it("히스테리시스: 표시 중이면 keepReach까지 유지, 넘으면 해제 (탁자와 같은 규칙)", () => {
    const between = {
      ...eastOfCampfire((RULES.reach + RULES.keepReach) / 2),
      targetYaw: FACING_WEST,
    };
    expect(resolve(between, written)).toBeNull();
    expect(resolve(between, written, "campfire")?.id).toBe("campfire");
    const beyond = { ...eastOfCampfire(RULES.keepReach + 0.01), targetYaw: FACING_WEST };
    expect(resolve(beyond, written, "campfire")).toBeNull();
  });

  it("탁자·모닥불 사이 통로(WRITTEN): 바라보는 쪽 하나만 표시된다", () => {
    // 두 충돌 영역 사이 가운데. 탁자 동쪽 면과 모닥불 원 서쪽 끝 사이
    const x = (TABLE_COLLIDER.maxX + CAMPFIRE_COLLIDER.x - CAMPFIRE_COLLIDER.radius) / 2;
    const z = CAMPFIRE_COLLIDER.z;
    expect(resolve({ x, z, targetYaw: FACING_WEST }, written)?.id).toBe("table");
    expect(resolve({ x, z, targetYaw: FACING_EAST }, written)?.id).toBe("campfire");
  });

  it("작성 모드에서는 모닥불 상호작용이 없다", () => {
    expect(
      resolve(
        { ...eastOfCampfire(0.3), targetYaw: FACING_WEST },
        { mode: "WRITING", status: "WRITTEN" },
      ),
    ).toBeNull();
  });
});
