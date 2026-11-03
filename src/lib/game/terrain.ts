// 바닥 높이 격자 (heightfield). 바닥 메시의 실제 높이를 격자로 샘플링해 두고, 이동 판정은 이 격자만 읽는다.
// 높이를 재는 방법(광선)은 호출하는 쪽이 sampleHeight로 넘긴다. 그래서 이 파일은 Three 없이 테스트할 수 있다.

import type { Bounds2D } from "./worldConfig";

export interface Heightfield {
  minX: number;
  minZ: number;
  cellSize: number;
  /** X 방향 점 개수 */
  cols: number;
  /** Z 방향 점 개수 */
  rows: number;
  /** rows × cols, 행 우선 (index = row * cols + col). null = 그 지점에 바닥이 없음 */
  heights: readonly (number | null)[];
}

/**
 * bounds를 cellSize 간격으로 샘플링해 격자를 만든다.
 * sampleHeight가 null을 돌려준 지점은 바닥이 없는 곳(허공)이다.
 */
export function createHeightfield(
  bounds: Bounds2D,
  cellSize: number,
  sampleHeight: (x: number, z: number) => number | null,
): Heightfield {
  const cols = Math.floor((bounds.maxX - bounds.minX) / cellSize + 1e-9) + 1;
  const rows = Math.floor((bounds.maxZ - bounds.minZ) / cellSize + 1e-9) + 1;
  const heights: (number | null)[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      heights.push(sampleHeight(bounds.minX + col * cellSize, bounds.minZ + row * cellSize));
    }
  }
  return { minX: bounds.minX, minZ: bounds.minZ, cellSize, cols, rows, heights };
}

/**
 * (x, z)의 바닥 높이를 주변 격자점 4개로 쌍선형 보간한다.
 * 격자 밖이거나, 4개 중 하나라도 바닥이 없으면 null (가장자리에서 허공으로 이어지는 칸은 서 있을 수 없다).
 */
export function getTerrainHeight(field: Heightfield, x: number, z: number): number | null {
  const gx = (x - field.minX) / field.cellSize;
  const gz = (z - field.minZ) / field.cellSize;
  if (gx < 0 || gz < 0 || gx > field.cols - 1 || gz > field.rows - 1) return null;

  // 마지막 격자선 위의 점도 마지막 칸 안으로 보고 보간한다
  const col = Math.min(Math.floor(gx), field.cols - 2);
  const row = Math.min(Math.floor(gz), field.rows - 2);
  const tx = gx - col;
  const tz = gz - row;

  const h00 = field.heights[row * field.cols + col];
  const h10 = field.heights[row * field.cols + col + 1];
  const h01 = field.heights[(row + 1) * field.cols + col];
  const h11 = field.heights[(row + 1) * field.cols + col + 1];
  if (h00 == null || h10 == null || h01 == null || h11 == null) return null;

  const top = h00 + (h10 - h00) * tx;
  const bottom = h01 + (h11 - h01) * tx;
  return top + (bottom - top) * tz;
}

/**
 * 반지름 radius인 원이 바닥 위에 온전히 서 있을 수 있는가.
 * 중심과 상하좌우 네 점이 모두 바닥 위여야 한다. 몸 일부가 허공에 걸치는 것을 막는다.
 */
export function canStandOnTerrain(
  field: Heightfield,
  x: number,
  z: number,
  radius: number,
): boolean {
  return (
    getTerrainHeight(field, x, z) !== null &&
    getTerrainHeight(field, x + radius, z) !== null &&
    getTerrainHeight(field, x - radius, z) !== null &&
    getTerrainHeight(field, x, z + radius) !== null &&
    getTerrainHeight(field, x, z - radius) !== null
  );
}

/**
 * 높이 fromY에서 toY로 수평 거리 distance만큼 이동할 수 있는가.
 * 높이 차가 maxStepHeight를 넘거나, 경사(높이 차 / 거리)가 maxSlope를 넘으면 막는다. 오르막·내리막 모두 같다.
 */
export function canStep(
  fromY: number,
  toY: number,
  distance: number,
  maxStepHeight: number,
  maxSlope: number,
): boolean {
  const rise = Math.abs(toY - fromY);
  if (rise > maxStepHeight) return false;
  if (distance <= 0) return rise === 0;
  return rise / distance <= maxSlope;
}
