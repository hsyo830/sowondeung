import { describe, expect, it } from "vitest";

import { canStandOnTerrain, canStep, createHeightfield, getTerrainHeight } from "./terrain";

const BOUNDS = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };

describe("createHeightfield", () => {
  it("범위를 cellSize 간격으로 샘플링한다 (양 끝 포함)", () => {
    const sampled: [number, number][] = [];
    const field = createHeightfield(BOUNDS, 1, (x, z) => {
      sampled.push([x, z]);
      return 0;
    });
    expect(field.cols).toBe(5);
    expect(field.rows).toBe(5);
    expect(field.heights).toHaveLength(25);
    expect(sampled[0]).toEqual([0, 0]);
    expect(sampled.at(-1)).toEqual([4, 4]);
  });

  it("행 우선으로 저장한다 (index = row * cols + col)", () => {
    const field = createHeightfield(BOUNDS, 1, (x, z) => x + z * 10);
    expect(field.heights[2 * field.cols + 3]).toBe(3 + 2 * 10);
  });
});

describe("getTerrainHeight", () => {
  const slope = createHeightfield(BOUNDS, 1, (x) => x * 0.5);

  it("격자점에서는 샘플 값 그대로다", () => {
    expect(getTerrainHeight(slope, 2, 3)).toBeCloseTo(1);
  });

  it("격자 사이는 선형 보간한다", () => {
    expect(getTerrainHeight(slope, 2.5, 1.2)).toBeCloseTo(1.25);
  });

  it("마지막 격자선 위도 높이를 돌려준다", () => {
    expect(getTerrainHeight(slope, 4, 4)).toBeCloseTo(2);
  });

  it("격자 밖은 null (바닥 없음)", () => {
    expect(getTerrainHeight(slope, -0.01, 2)).toBeNull();
    expect(getTerrainHeight(slope, 2, 4.01)).toBeNull();
  });

  it("주변 격자점 중 하나라도 바닥이 없으면 null", () => {
    const hole = createHeightfield(BOUNDS, 1, (x, z) => (x === 2 && z === 2 ? null : 0));
    expect(getTerrainHeight(hole, 1.5, 1.5)).toBeNull();
    expect(getTerrainHeight(hole, 0.5, 0.5)).toBe(0);
  });
});

describe("canStandOnTerrain", () => {
  const flat = createHeightfield(BOUNDS, 1, () => 0);

  it("원 전체가 바닥 위면 설 수 있다", () => {
    expect(canStandOnTerrain(flat, 2, 2, 0.4)).toBe(true);
  });

  it("중심은 바닥 위여도 몸 일부가 바닥 밖으로 나가면 설 수 없다", () => {
    expect(canStandOnTerrain(flat, 0.2, 2, 0.4)).toBe(false);
    expect(canStandOnTerrain(flat, 2, 3.9, 0.4)).toBe(false);
  });
});

describe("canStep", () => {
  it("완만한 경사는 오르내릴 수 있다", () => {
    expect(canStep(0, 0.05, 0.1, 0.3, 0.9)).toBe(true);
    expect(canStep(0.05, 0, 0.1, 0.3, 0.9)).toBe(true);
  });

  it("급경사는 오르막·내리막 모두 막는다", () => {
    expect(canStep(0, 0.1, 0.1, 0.3, 0.9)).toBe(false);
    expect(canStep(0.1, 0, 0.1, 0.3, 0.9)).toBe(false);
  });

  it("거리가 길어도 단차가 상한을 넘으면 막는다", () => {
    expect(canStep(0, 0.31, 10, 0.3, 0.9)).toBe(false);
  });

  it("제자리(거리 0)는 높이가 같을 때만 허용한다", () => {
    expect(canStep(0, 0, 0, 0.3, 0.9)).toBe(true);
    expect(canStep(0, 0.01, 0, 0.3, 0.9)).toBe(false);
  });
});
