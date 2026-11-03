// 초저녁 하늘 배경막의 정점 색 계산. 순수 함수다 (색은 0~1 선형 RGB 숫자로 주고받는다).
//
// 3인칭 카메라는 아래로 약 26° 내려다봐서 화면 맨 위가 지평선보다 1.2° 아래다. 진짜 하늘(지평선 위)은 화면에 들어오지 않는다.
// 그래서 섬을 둘러싼 원통 배경막에 높이별 그라데이션을 칠하고, 원통 아래쪽 색 = 안개색으로 맞춰
// 완전히 안개에 덮인 먼 바닥과 이음새 없이 이어지게 한다 (DEV_LOG forest-atmosphere).
//
// sky-polish 4차 — 띠·수평 경계가 보이던 원인과 처리:
// 1. 구간마다 smoothstep을 걸어 각 단계 높이에서 변화 속도가 0이 됐다 → 단계 색마다 평평한 면(띠)이 생겼다.
//    → 단계 전체를 한 번에 잇는 단조 3차 보간(PCHIP, Fritsch–Carlson)으로 바꾼다. 곡선이 매끄럽고(C1)
//      단계 사이에서 색이 넘치거나(overshoot) 되돌아가지 않는다.
// 2. 선형 RGB에서 섞어 밝은 분홍이 중간색을 끌어올렸다가 남보라 쪽에서 갑자기 어두워졌다.
//    → 지각적으로 균일한 OKLab에서 섞는다. 밝기·색이 눈에 고르게 바뀐다.
// 3. 맨 아래 단계에서 기울기가 있으면 안개 단색 면과 만나는 줄이 보인다 → 첫 단계(와 마지막 단계)는 기울기 0으로 시작한다.

export type Rgb = readonly [number, number, number];

/** 그라데이션 한 단계 (선형 RGB) */
export interface SkyStop {
  /** 이 색이 정확히 나오는 높이 (월드 y). 아래에서 위로 오름차순 */
  y: number;
  color: Rgb;
  /** 노을 쪽(glowDirection)을 볼 때의 색. 없으면 방향과 상관없이 color */
  glowColor?: Rgb;
}

export interface SkyGlowDirection {
  /** 노을 방향 (XZ, 단위 벡터) */
  x: number;
  z: number;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const k = clamp01(t);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** 선형 sRGB → OKLab (Björn Ottosson, 2020) */
export function linearRgbToOklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → 선형 sRGB. 표현 범위 밖 값은 0~1로 자른다 */
export function oklabToLinearRgb([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * 단조 3차 Hermite 보간 (PCHIP). xs 오름차순, 점 2개 이상.
 * 안쪽 점의 기울기는 Fritsch–Carlson(이웃 기울기의 조화 평균, 부호가 다르면 0)이라 점 사이에서 값이 넘치지 않는다.
 * 양 끝 기울기는 0 → 범위 밖 평평한 색(안개·맨 위)과 꺾임 없이 이어진다.
 */
export function interpolateMonotone(
  xs: readonly number[],
  ys: readonly number[],
  x: number,
): number {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];

  let i = 0;
  while (x > xs[i + 1]) i += 1;

  const slopeAt = (k: number): number => {
    if (k === 0 || k === n - 1) return 0;
    const d0 = (ys[k] - ys[k - 1]) / (xs[k] - xs[k - 1]);
    const d1 = (ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]);
    if (d0 === 0 || d1 === 0 || Math.sign(d0) !== Math.sign(d1)) return 0;
    const w0 = 2 * (xs[k + 1] - xs[k]) + (xs[k] - xs[k - 1]);
    const w1 = xs[k + 1] - xs[k] + 2 * (xs[k] - xs[k - 1]);
    return (w0 + w1) / (w0 / d0 + w1 / d1);
  };

  const h = xs[i + 1] - xs[i];
  const t = (x - xs[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * ys[i] +
    (t3 - 2 * t2 + t) * h * slopeAt(i) +
    (-2 * t3 + 3 * t2) * ys[i + 1] +
    (t3 - t2) * h * slopeAt(i + 1)
  );
}

/**
 * 바닥이 끝나는 곳(카메라 중심 원판의 가장자리)과 배경막이 화면에서 만나는 높이 (월드 y).
 * 카메라에서 원판 가장자리를 스치는 시선은 내려가는 기울기 (cameraY − groundY) / groundRadius로 배경막(반지름 backdropRadius)까지
 * 이어진다. 배경막과 원판이 모두 카메라 중심이라 방향과 상관없이 같은 값이다.
 * 배경막 색은 이 높이 이하에서 안개색이어야 이음새가 없다 (첫 단계 높이 ≥ 이 값).
 */
export function getBackdropJunctionY(
  cameraY: number,
  groundY: number,
  groundRadius: number,
  backdropRadius: number,
): number {
  return cameraY - (backdropRadius * (cameraY - groundY)) / groundRadius;
}

/**
 * 바닥 원판 가장자리 한 점의 카메라 깊이 (three 안개는 직선거리가 아니라 이 깊이로 계산한다).
 * 카메라가 pitchRad만큼 내려다보고, 그 점이 정면에서 수평으로 yawRad만큼 옆에 있을 때:
 * 깊이 = 반지름 × cos(pitch) × cos(yaw) + 카메라 높이 × sin(pitch). 화면 옆 끝(yaw = 수평 반화각)에서 가장 작다.
 * 이 값이 fogFar 이상이어야 바닥 끝이 화면 어디서나 완전히 안개색이다.
 */
export function getGroundEdgeViewDepth(
  groundRadius: number,
  cameraHeightAboveGround: number,
  pitchRad: number,
  yawRad: number,
): number {
  return (
    groundRadius * Math.cos(pitchRad) * Math.cos(yawRad) +
    cameraHeightAboveGround * Math.sin(pitchRad)
  );
}

/**
 * 배경막 한 점의 색 (선형 RGB). y는 높이, (dirX, dirZ)는 원통 중심에서 그 점을 향하는 수평 방향(단위 벡터)이다.
 * - 첫 단계 높이 이하는 방향과 상관없이 정확히 첫 단계 색(= 안개색)이다 → 안개 낀 바닥과 이음새가 없다.
 * - 노을 쪽일수록 glowColor 쪽으로 기운다 (OKLab에서 섞음).
 * - 단계 사이는 OKLab 각 성분을 PCHIP으로 잇는다.
 */
export function getSkyBackdropColor(
  y: number,
  dirX: number,
  dirZ: number,
  stops: readonly SkyStop[],
  glow: SkyGlowDirection,
): Rgb {
  if (y <= stops[0].y) return stops[0].color;
  const top = stops[stops.length - 1];
  if (y >= top.y && !top.glowColor) return top.color;

  const facing = clamp01((dirX * glow.x + dirZ * glow.z + 1) / 2);
  const weight = facing * facing;
  const labs = stops.map((stop) => {
    const base = linearRgbToOklab(stop.color);
    if (!stop.glowColor) return base;
    return mixRgb(base, linearRgbToOklab(stop.glowColor), weight);
  });
  const xs = stops.map((stop) => stop.y);
  const channel = (index: 0 | 1 | 2) =>
    interpolateMonotone(
      xs,
      labs.map((value) => value[index]),
      y,
    );
  return oklabToLinearRgb([channel(0), channel(1), channel(2)]);
}
