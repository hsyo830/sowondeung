import { describe, expect, it } from "vitest";

import { createRandom, createSkyStars, getStarDensity } from "./stars";
import type { SkyStarsConfig } from "./stars";
import { ATMOSPHERE_CONFIG, CAMERA_CONFIG, SKY_STARS_CONFIG, TERRAIN_CONFIG } from "./worldConfig";
import { getBackdropJunctionY } from "./sky";

const CONFIG: SkyStarsConfig = {
  count: 300,
  radius: 78,
  minY: 1.5,
  lowBandMaxY: 4.5,
  maxY: 24,
  lowBandShare: 0.4,
  minStrength: 0.25,
  maxStrength: 0.7,
  sizeShares: [0.6, 0.3, 0.1],
  tintCount: 2,
  seed: 7,
};

describe("createRandom", () => {
  it("같은 시드는 같은 수열, 값은 [0, 1)", () => {
    const a = createRandom(3);
    const b = createRandom(3);
    for (let i = 0; i < 100; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("createSkyStars", () => {
  const stars = createSkyStars(CONFIG);

  it("개수·높이·반지름·세기·크기·색 번호가 설정 범위 안이다", () => {
    expect(stars).toHaveLength(CONFIG.count);
    for (const star of stars) {
      expect(star.y).toBeGreaterThanOrEqual(CONFIG.minY);
      expect(star.y).toBeLessThanOrEqual(CONFIG.maxY);
      expect(Math.hypot(star.x, star.z)).toBeCloseTo(CONFIG.radius, 6);
      expect(star.strength).toBeGreaterThanOrEqual(CONFIG.minStrength);
      expect(star.strength).toBeLessThanOrEqual(CONFIG.maxStrength);
      expect(star.sizeIndex).toBeGreaterThanOrEqual(0);
      expect(star.sizeIndex).toBeLessThan(CONFIG.sizeShares.length);
      expect([0, 1]).toContain(star.tintIndex);
    }
  });

  it("같은 설정이면 매번 같은 하늘이다", () => {
    expect(createSkyStars(CONFIG)).toEqual(stars);
  });

  it("고르게 깔리지 않는다 (방위각 구간별 개수 차이가 크다)", () => {
    const bins = new Array(12).fill(0);
    for (const star of stars) {
      const angle = (Math.atan2(star.z, star.x) + Math.PI * 2) % (Math.PI * 2);
      bins[Math.floor((angle / (Math.PI * 2)) * 12)] += 1;
    }
    expect(Math.max(...bins)).toBeGreaterThan(Math.min(...bins) * 1.8);
  });

  it("약한 별이 대부분이다 (세기 중간값이 범위 가운데보다 아래)", () => {
    const sorted = stars.map((star) => star.strength).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    expect(median).toBeLessThan((CONFIG.minStrength + CONFIG.maxStrength) / 2);
  });
});

describe("getStarDensity", () => {
  it("0.15~1 범위다", () => {
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      const value = getStarDensity(angle, 5);
      expect(value).toBeGreaterThanOrEqual(0.15);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("게임 설정의 별 (하늘에만 보이는 조건)", () => {
  const stars = createSkyStars(SKY_STARS_CONFIG);

  it("모든 별이 바닥이 하늘과 만나는 높이보다 한참 위다 (잔디·지면 쪽에는 별이 없다)", () => {
    const junction = getBackdropJunctionY(
      0.83 + CAMERA_CONFIG.offset[1],
      TERRAIN_CONFIG.extensionY,
      TERRAIN_CONFIG.farGroundRadius,
      ATMOSPHERE_CONFIG.skyBackdrop.radius,
    );
    for (const star of stars) expect(star.y).toBeGreaterThan(junction + 2);
  });

  it("별은 배경막 바로 안쪽, 바닥 원판보다 바깥에 있다 (월드 오브젝트보다 항상 멀다)", () => {
    expect(SKY_STARS_CONFIG.radius).toBeLessThan(ATMOSPHERE_CONFIG.skyBackdrop.radius);
    expect(SKY_STARS_CONFIG.radius).toBeGreaterThan(TERRAIN_CONFIG.farGroundRadius);
  });

  it("평소 3인칭 화면(정면 ±37°, 화면에 보이는 높이)에는 수십 개 이하만 놓인다 (나무에 가려 더 적게 보인다)", () => {
    const cameraY = 0.7 + CAMERA_CONFIG.offset[1];
    const topY = cameraY - ATMOSPHERE_CONFIG.skyBackdrop.radius * Math.tan((1.2 * Math.PI) / 180);
    const halfYaw = (37 * Math.PI) / 180;
    const visible = stars.filter((star) => {
      // 카메라는 -z를 본다. 정면에서 벗어난 각도
      const yaw = Math.atan2(star.x, -star.z);
      return Math.abs(yaw) <= halfYaw && star.y <= topY;
    });
    expect(visible.length).toBeGreaterThanOrEqual(10);
    expect(visible.length).toBeLessThanOrEqual(35);
  });
});
