// 초저녁 하늘 배경막의 정점 색 계산. 순수 함수다 (색은 0~1 RGB 숫자로 주고받는다).
//
// 3인칭 카메라는 아래로 약 26° 내려다봐서 화면 맨 위가 지평선보다 1.2° 아래다. 진짜 하늘(지평선 위)은 화면에 들어오지 않는다.
// 그래서 섬을 둘러싼 원통 배경막에 높이별 그라데이션을 칠하고, 원통 아래쪽 색 = 안개색으로 맞춰
// 완전히 안개에 덮인 먼 바닥과 이음새 없이 이어지게 한다 (DEV_LOG forest-atmosphere).

export type Rgb = readonly [number, number, number];

export interface SkyPalette {
  /** 배경막 아래쪽 = 안개색. 먼 바닥과 이어지는 색 */
  horizon: Rgb;
  /** 지평선 바로 위 띠 (노을 반대쪽) */
  band: Rgb;
  /** 지평선 바로 위 띠 (노을 쪽). 해가 진 방향에 남은 따뜻한 빛 */
  glow: Rgb;
  /** 띠 위의 연보라 */
  upper: Rgb;
  /** 맨 위의 푸른 보라 */
  zenith: Rgb;
}

export interface SkyBackdropShape {
  /** 이 높이 이하는 horizon 색 (안개 낀 바닥과 만나는 부분) */
  bottomY: number;
  /** 노을 띠가 가장 진한 높이 */
  bandY: number;
  /** upper 색 높이 */
  upperY: number;
  /** 이 높이 이상은 zenith 색 */
  topY: number;
  /** 노을 방향 (XZ, 단위 벡터) */
  glowDirX: number;
  glowDirZ: number;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

function smooth(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = clamp01(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/**
 * 배경막 한 점의 색. y는 높이, (dirX, dirZ)는 원통 중심에서 그 점을 향하는 수평 방향(단위 벡터)이다.
 * 노을 쪽일수록 띠가 따뜻하다. bottomY 이하는 방향과 상관없이 정확히 horizon이다 (안개와 이음새 없음).
 */
export function getSkyBackdropColor(
  y: number,
  dirX: number,
  dirZ: number,
  palette: SkyPalette,
  shape: SkyBackdropShape,
): Rgb {
  if (y <= shape.bottomY) return palette.horizon;

  const facing = clamp01((dirX * shape.glowDirX + dirZ * shape.glowDirZ + 1) / 2);
  const band = mixRgb(palette.band, palette.glow, facing * facing);

  if (y <= shape.bandY) {
    return mixRgb(
      palette.horizon,
      band,
      smooth((y - shape.bottomY) / (shape.bandY - shape.bottomY)),
    );
  }
  if (y <= shape.upperY) {
    return mixRgb(band, palette.upper, smooth((y - shape.bandY) / (shape.upperY - shape.bandY)));
  }
  return mixRgb(
    palette.upper,
    palette.zenith,
    smooth((y - shape.upperY) / (shape.topY - shape.upperY)),
  );
}
