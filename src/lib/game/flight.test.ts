import { describe, expect, it } from "vitest";

import type { FlyingLanternData } from "@/types/game";

import {
  appendFlyingLantern,
  clampDelta,
  FLIGHT_RISE_SPEED,
  FLIGHT_SWAY_AMPLITUDE,
  getDriftProgress,
  getEasedTime,
  getFlyingLanternPosition,
  getLaunchPose,
  getRightHandDirection,
  getRiseOffset,
  getSpinAngle,
  getSwayOffset,
  LAB_FLIGHT_PROFILE,
  MAX_DELTA_SEC,
  MAX_FLIGHT_HEIGHT,
  MAX_FLIGHT_SEC,
  MAX_FLYING_LANTERNS,
  removeFlyingLanternById,
  shouldRemoveFlyingLantern,
} from "./flight";
import type { FlightProfile, LaunchClearance } from "./flight";
import { FLYING_LANTERN_CONFIG, HELD_LANTERN_CONFIG } from "./worldConfig";

describe("궤적", () => {
  it("0초에는 출발 위치·각도 그대로다", () => {
    expect(getRiseOffset(0)).toBe(0);
    expect(getSwayOffset(0)).toBe(0);
    expect(getSpinAngle(0)).toBe(0);
  });

  it("시간에 비례해 상승한다", () => {
    expect(getRiseOffset(2)).toBeCloseTo(2 * FLIGHT_RISE_SPEED);
    expect(getRiseOffset(3)).toBeGreaterThan(getRiseOffset(2));
  });

  it("좌우 흔들림은 진폭을 넘지 않는다", () => {
    for (let t = 0; t < 20; t += 0.13) {
      expect(Math.abs(getSwayOffset(t))).toBeLessThanOrEqual(FLIGHT_SWAY_AMPLITUDE + 1e-9);
    }
  });
});

describe("clampDelta", () => {
  it("상한을 넘는 delta는 상한으로 자른다 (탭 복귀)", () => {
    expect(clampDelta(5)).toBe(MAX_DELTA_SEC);
  });

  it("상한 이하는 그대로, 음수는 0", () => {
    expect(clampDelta(0.016)).toBe(0.016);
    expect(clampDelta(-1)).toBe(0);
  });
});

describe("shouldRemoveFlyingLantern", () => {
  it("높이·시간이 모두 한도 이하면 유지한다 (경계값 포함)", () => {
    expect(shouldRemoveFlyingLantern(MAX_FLIGHT_HEIGHT, MAX_FLIGHT_SEC)).toBe(false);
  });

  it("높이가 한도를 넘으면 제거한다", () => {
    expect(shouldRemoveFlyingLantern(MAX_FLIGHT_HEIGHT + 0.01, 1)).toBe(true);
  });

  it("경과 시간이 한도를 넘으면 제거한다", () => {
    expect(shouldRemoveFlyingLantern(0, MAX_FLIGHT_SEC + 0.01)).toBe(true);
  });
});

describe("궤적 프로필 — 게임 발사 천등 (4단계)", () => {
  const profile: FlightProfile = { ...FLYING_LANTERN_CONFIG.flight };

  it("기본값은 1단계 랩 궤적 그대로다 (랩 회귀 방지)", () => {
    expect(getRiseOffset(2)).toBe(getRiseOffset(2, LAB_FLIGHT_PROFILE));
    expect(getSwayOffset(1.3)).toBe(getSwayOffset(1.3, LAB_FLIGHT_PROFILE));
    expect(getSpinAngle(4)).toBe(getSpinAngle(4, LAB_FLIGHT_PROFILE));
    expect(getEasedTime(3, 0)).toBe(3);
  });

  it("출발 순간 위치·각도가 그대로이고 속도도 0에서 시작한다 (튀지 않음)", () => {
    expect(getRiseOffset(0, profile)).toBe(0);
    expect(getSwayOffset(0, profile)).toBe(0);
    expect(getSpinAngle(0, profile)).toBe(0);
    // 첫 프레임(1/60초) 상승량이 최고 속도로 1프레임 간 거리의 5% 미만
    const firstFrame = 1 / 60;
    expect(getRiseOffset(firstFrame, profile)).toBeLessThan(profile.riseSpeed * firstFrame * 0.05);
  });

  it("가속이 끝나면 최고 속도로 오르고, 계속 위로만 간다", () => {
    let previous = 0;
    for (let t = 0.1; t <= MAX_FLIGHT_SEC; t += 0.1) {
      const rise = getRiseOffset(t, profile);
      expect(rise).toBeGreaterThan(previous);
      previous = rise;
    }
    const speed = (getRiseOffset(10.01, profile) - getRiseOffset(10, profile)) / 0.01;
    expect(speed).toBeCloseTo(profile.riseSpeed, 3);
  });

  it("흔들림은 진폭을 넘지 않는다", () => {
    for (let t = 0; t < MAX_FLIGHT_SEC; t += 0.07) {
      expect(Math.abs(getSwayOffset(t, profile))).toBeLessThanOrEqual(profile.swayAmplitude + 1e-9);
    }
  });

  it("drift 진행률은 0에서 시작해 driftSec에 1이 된다", () => {
    expect(getDriftProgress(0, profile)).toBe(0);
    expect(getDriftProgress(profile.driftSec / 2, profile)).toBeCloseTo(0.5);
    expect(getDriftProgress(profile.driftSec, profile)).toBe(1);
    expect(getDriftProgress(5, LAB_FLIGHT_PROFILE)).toBe(1);
  });

  it("상승 속도로는 20초 안에 높이 40에 닿지 않으므로 시간 조건으로 제거된다", () => {
    const groundY = 0.83;
    const topY = groundY + 1 + getRiseOffset(MAX_FLIGHT_SEC, profile);
    expect(shouldRemoveFlyingLantern(topY, MAX_FLIGHT_SEC)).toBe(false);
    expect(shouldRemoveFlyingLantern(topY, MAX_FLIGHT_SEC + 0.01)).toBe(true);
  });
});

function flyingLantern(id: string): FlyingLanternData {
  return { id, colorId: "red", strokes: [], spawn: [0, 1, 0], yaw: 0, drift: [0, 0] };
}

describe("발사 천등 목록 (SPEC §5 최대 5개)", () => {
  it("뒤에 추가하고 입력 배열은 바꾸지 않는다", () => {
    const before = [flyingLantern("a")];
    const after = appendFlyingLantern(before, flyingLantern("b"));
    expect(after.map((item) => item.id)).toEqual(["a", "b"]);
    expect(before.map((item) => item.id)).toEqual(["a"]);
  });

  it("최대 개수를 넘으면 가장 오래된 것부터 제거한다", () => {
    let list: FlyingLanternData[] = [];
    for (let i = 1; i <= MAX_FLYING_LANTERNS + 2; i++) {
      list = appendFlyingLantern(list, flyingLantern(`lantern-${i}`));
    }
    expect(list).toHaveLength(MAX_FLYING_LANTERNS);
    expect(list.map((item) => item.id)).toEqual([
      "lantern-3",
      "lantern-4",
      "lantern-5",
      "lantern-6",
      "lantern-7",
    ]);
  });

  it("같은 id는 중복으로 들어가지 않는다 (같은 React key 방지)", () => {
    const list = appendFlyingLantern([flyingLantern("a")], flyingLantern("a"));
    expect(list).toHaveLength(1);
  });

  it("제거: 있으면 빼고, 없는 id면 null (두 번 제거해도 상태 변화 없음)", () => {
    const list = [flyingLantern("a"), flyingLantern("b")];
    const removed = removeFlyingLanternById(list, "a");
    expect(removed?.map((item) => item.id)).toEqual(["b"]);
    expect(removeFlyingLanternById(removed ?? [], "a")).toBeNull();
  });
});

describe("getLaunchPose — 손에 든 천등에서 출발", () => {
  const clearance: LaunchClearance = { ...FLYING_LANTERN_CONFIG.launch };
  const player = { x: 2, y: 0.8, z: 5 };

  it("평소(몸 옆·바닥 위)에는 손에 든 위치에서 그대로 출발한다 (위치가 튀지 않음)", () => {
    const lantern = { x: 2.45, y: 1.25, z: 5 };
    const pose = getLaunchPose(lantern, player, 1.2, clearance);
    expect(pose.spawn).toEqual([2.45, 1.25, 5]);
    expect(pose.yaw).toBe(1.2);
  });

  it("drift는 캐릭터 바깥 방향으로 clearDistance까지다", () => {
    const pose = getLaunchPose({ x: 2.45, y: 1.25, z: 5 }, player, 0, clearance);
    expect(pose.drift[0]).toBeCloseTo(clearance.clearDistance - 0.45);
    expect(pose.drift[1]).toBeCloseTo(0);
    const finalX = pose.spawn[0] + pose.drift[0];
    expect(finalX - player.x).toBeCloseTo(clearance.clearDistance);
  });

  it("이미 충분히 멀면 drift가 없다", () => {
    const pose = getLaunchPose({ x: 3.5, y: 1.25, z: 5 }, player, 0, clearance);
    expect(pose.drift).toEqual([0, 0]);
  });

  it("바닥 아래에서 시작하지 않는다", () => {
    const pose = getLaunchPose({ x: 2.45, y: 0.5, z: 5 }, player, 0, clearance);
    expect(pose.spawn[1]).toBeCloseTo(player.y + clearance.minHeightAboveGround);
  });

  it("몸속(중심에 가까움)이면 같은 방향으로 바깥까지 민다", () => {
    const pose = getLaunchPose({ x: 2, y: 1.25, z: 5.1 }, player, 0, clearance);
    expect(Math.hypot(pose.spawn[0] - player.x, pose.spawn[2] - player.z)).toBeCloseTo(
      clearance.minBodyDistance,
    );
    expect(pose.spawn[2]).toBeGreaterThan(player.z);
  });

  it("중심과 정확히 겹치면 캐릭터 오른쪽(yaw 기준)으로 민다", () => {
    const yaw = Math.PI; // -z를 바라봄 → 오른손은 +x 쪽
    expect(getRightHandDirection(yaw)[0]).toBeCloseTo(1);
    const pose = getLaunchPose({ ...player }, player, yaw, clearance);
    expect(pose.spawn[0] - player.x).toBeCloseTo(clearance.minBodyDistance);
    expect(pose.spawn[1]).toBeGreaterThanOrEqual(player.y + clearance.minHeightAboveGround);
  });

  it("손 천등 기본 위치(오른쪽 옆)는 오른손 방향과 같다 (yaw 0 = +z를 볼 때 오른쪽은 -x)", () => {
    const [dirX, dirZ] = getRightHandDirection(0);
    const [offsetX] = HELD_LANTERN_CONFIG.fallbackPosition;
    expect(Math.sign(dirX)).toBe(Math.sign(offsetX));
    expect(dirZ).toBeCloseTo(0);
  });
});

describe("getFlyingLanternPosition — 그리기와 카메라가 공유하는 천등 위치", () => {
  const profile: FlightProfile = { ...FLYING_LANTERN_CONFIG.flight };
  const spawn = [1, 1.2, 4] as const;
  const drift = [0.5, -0.2] as const;

  it("출발 순간에는 출발 위치 그대로", () => {
    const out = { x: 0, y: 0, z: 0 };
    getFlyingLanternPosition(spawn, drift, 0, profile, out);
    expect(out).toEqual({ x: 1, y: 1.2, z: 4 });
  });

  it("상승·흔들림·drift를 합친 결과 (기존 FlyingLantern 계산과 같다)", () => {
    const out = { x: 0, y: 0, z: 0 };
    for (const t of [0.3, 1, 2.5, 10]) {
      getFlyingLanternPosition(spawn, drift, t, profile, out);
      const progress = getDriftProgress(t, profile);
      expect(out.x).toBeCloseTo(spawn[0] + drift[0] * progress + getSwayOffset(t, profile));
      expect(out.y).toBeCloseTo(spawn[1] + getRiseOffset(t, profile));
      expect(out.z).toBeCloseTo(spawn[2] + drift[1] * progress);
    }
  });
});
