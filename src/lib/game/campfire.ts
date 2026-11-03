// 모닥불 불꽃 일렁임 계산. 순수 함수다 (시간은 인자로 받는다).
//
// 불꽃 메시(GLB `Mball.018`)는 정점 620개짜리 하나의 메시라 본·모프가 없다. 그래서 매 프레임 정점을 직접 옮긴다.
// - 바닥 높이(baseY) 아래 정점은 그대로 둔다 → 불꽃 밑동이 장작에 붙어 있다.
// - 높이 비율의 제곱만큼 옮긴다 → 끝으로 갈수록 크게 휘고, 통째로 기울거나 회전하지 않는다.
// - 주기가 서로 나누어떨어지지 않는 사인 3개를 더해 같은 모양이 짧게 반복되지 않게 한다.
// - 갈래 떨림은 위상이 높이와 함께 늦어지는 물결이라 시간이 지나면 위로 올라간다 (불꽃이 위로 핥아 오르는 느낌).
// 색은 재질 하나의 emissive(메시 전체 단색)로는 안팎을 나눌 수 없어 정점 색으로 칠한다 (writeFlameColors).

/** 불꽃 메시의 월드 기준 모양 (측정값, WorldConfig) */
export interface FlameShape {
  /** 흔들림·늘어남의 중심축 */
  centerX: number;
  centerZ: number;
  /** 이 높이 아래는 움직이지 않는다 (모닥불 자리 바닥 높이) */
  baseY: number;
  /** 불꽃 최고점. baseY~topY가 높이 비율 0~1이다 */
  topY: number;
}

/** 일렁임 세기 (WorldConfig) */
export interface FlameMotionConfig {
  /** 세로 늘어남 비율의 최대 변화 (0.1 → 0.9~1.1배) */
  stretch: number;
  /** 불꽃 끝의 최대 좌우 흔들림 (월드 단위) */
  sway: number;
  /** 불꽃 갈래마다 따로 떨리는 정도 (월드 단위, 끝 기준) */
  flutter: number;
  /** 밝기 변화 비율의 최대값 (0.15 → 0.85~1.15배) */
  glow: number;
}

export interface FlameMotion {
  /** 세로 배율 (1 = 원래 높이) */
  stretch: number;
  /** 불꽃 끝의 x·z 이동량 (월드 단위) */
  swayX: number;
  swayZ: number;
  /** 밝기 배율 (1 = 기본). 불꽃 정점 색의 뜨거운 정도에 더하고(glowHeat), pointLight 세기에 곱한다 */
  glow: number;
}

type Rgb = readonly [number, number, number];

/** 불꽃 색 4단계 (선형 RGB 0~1). 뜨거운 순서: core > mid > outer > edge */
export interface FlamePalette {
  /** 카메라를 정면으로 보는 아래쪽 가운데. 밝은 노랑 (흰색에 가까우면 하얗게 타 보인다) */
  core: Rgb;
  /** 노랑과 주황 사이 */
  mid: Rgb;
  /** 바깥 주황 */
  outer: Rgb;
  /** 실루엣 가장자리·불꽃 끝. 다홍 */
  edge: Rgb;
}

/** 불꽃 색 분포 (WorldConfig) */
export interface FlameColorConfig {
  /** 카메라를 정면으로 볼수록 뜨겁다: 이 값 × 정면도^facingPower */
  facingWeight: number;
  /** 정면도 지수. 1보다 크면 노란 가운데가 좁아지고 바깥 주황·다홍 띠가 넓어진다 */
  facingPower: number;
  /** 위로 갈수록 식는다: 이 값 × 높이 비율(0~1)을 뺀다 */
  heightCooling: number;
  /** 위로 올라가는 뜨거운 결의 세기 (뜨거운 정도 단위). 위쪽일수록 크게 흔들린다 */
  flicker: number;
  /** 일렁임 밝기(glow − 1)를 뜨거운 정도로 바꾸는 배율. 색에 곱하지 않으므로 팔레트보다 밝아지지 않는다 */
  glowHeat: number;
}

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * 불꽃 정점 하나의 '뜨거운 정도' 0~1.
 * 카메라를 정면으로 보는 면(화면에서 불꽃 가운데)일수록, 그리고 아래쪽일수록 뜨겁다.
 * 실루엣 가장자리(정면도 0)와 위쪽 끝은 식어서 다홍이 된다. offset은 일렁임(결·밝기)으로 더하는 값이다.
 */
export function getFlameHeat(
  facing: number,
  heightRatio: number,
  config: Pick<FlameColorConfig, "facingWeight" | "facingPower" | "heightCooling">,
  offset = 0,
): number {
  return clamp01(
    Math.pow(clamp01(facing), config.facingPower) * config.facingWeight -
      clamp01(heightRatio) * config.heightCooling +
      offset,
  );
}

/**
 * 시각 timeSec에 높이 비율·둘레 각도 자리의 뜨거운 결 (−amount~amount, 위쪽일수록 크다).
 * 위상이 높이와 함께 늦어지므로 밝은 결이 시간에 따라 위로 올라간다. 둘레 각도로 갈래마다 엇갈린다.
 */
export function getFlameFlicker(
  timeSec: number,
  heightRatio: number,
  angle: number,
  amount: number,
): number {
  const ratio = clamp01(heightRatio);
  return amount * (0.35 + 0.65 * ratio) * Math.sin(timeSec * 5.3 - ratio * 6.5 + angle * 3);
}

/** heat 0~1 → 4단계 팔레트 (edge 0, outer 1/3, mid 2/3, core 1 사이를 선형 보간) */
function mixFlameColor(palette: FlamePalette, heat: number, out: Float32Array, offset: number) {
  const scaled = clamp01(heat) * 3;
  const step = Math.min(Math.floor(scaled), 2);
  const t = scaled - step;
  const from = step === 0 ? palette.edge : step === 1 ? palette.outer : palette.mid;
  const to = step === 0 ? palette.outer : step === 1 ? palette.mid : palette.core;
  out[offset] = from[0] + (to[0] - from[0]) * t;
  out[offset + 1] = from[1] + (to[1] - from[1]) * t;
  out[offset + 2] = from[2] + (to[2] - from[2]) * t;
}

/**
 * 불꽃 정점 색을 out(rgb 연속 배열)에 쓴다. 매 프레임 호출하므로 새 배열을 만들지 않는다.
 * - positions: 지금 프레임의 정점 월드 좌표, normals: 정점 월드 법선(단위 벡터, 원래 모양 기준)
 * - 정면도 = 법선 · (정점 → 카메라 방향). 카메라가 움직여도 화면 속 불꽃의 가운데가 밝다.
 * - 뜨거운 정도에 위로 올라가는 결(getFlameFlicker)과 일렁임 밝기(glow)를 더한 뒤 4단계 팔레트로 칠한다.
 *   밝기를 색에 곱하지 않으므로 어떤 정점도 core보다 밝아지지 않는다 (하얗게 타 보이지 않음).
 */
export function writeFlameColors(
  positions: ArrayLike<number>,
  normals: ArrayLike<number>,
  out: Float32Array,
  shape: FlameShape,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  palette: FlamePalette,
  config: FlameColorConfig,
  glow: number,
  timeSec: number,
): void {
  const height = shape.topY - shape.baseY;
  const glowOffset = (glow - 1) * config.glowHeat;

  for (let i = 0; i < positions.length; i += 3) {
    const toX = cameraX - positions[i];
    const toY = cameraY - positions[i + 1];
    const toZ = cameraZ - positions[i + 2];
    const length = Math.hypot(toX, toY, toZ) || 1;
    const facing = (normals[i] * toX + normals[i + 1] * toY + normals[i + 2] * toZ) / length;
    const ratio = height > 0 ? (positions[i + 1] - shape.baseY) / height : 0;
    const angle = Math.atan2(positions[i + 2] - shape.centerZ, positions[i] - shape.centerX);
    const flicker = getFlameFlicker(timeSec, ratio, angle, config.flicker);
    mixFlameColor(palette, getFlameHeat(facing, ratio, config, flicker + glowOffset), out, i);
  }
}

/**
 * -1~1 범위의 부드러운 흔들림. 주기 비가 무리수에 가까운 사인 3개의 합이라
 * 한 사인보다 훨씬 긴 간격으로만 비슷한 모양이 돌아온다 (기계적인 반복 방지).
 */
export function wobble(timeSec: number, seed: number): number {
  const value =
    Math.sin(timeSec * 1.13 + seed) +
    0.6 * Math.sin(timeSec * 2.71 + seed * 1.7) +
    0.35 * Math.sin(timeSec * 5.37 + seed * 2.9);
  return value / 1.95;
}

/** 시각 timeSec의 불꽃 전체 움직임. 밝기는 불꽃 높이와 함께 오르내리도록 늘어남을 일부 섞는다 */
export function getFlameMotion(timeSec: number, config: FlameMotionConfig): FlameMotion {
  const rise = wobble(timeSec * 1.6, 0.4);
  return {
    stretch: 1 + config.stretch * rise,
    swayX: config.sway * wobble(timeSec * 1.1, 2.3),
    swayZ: config.sway * 0.7 * wobble(timeSec * 0.9, 5.1),
    glow: 1 + config.glow * (0.6 * rise + 0.4 * wobble(timeSec * 3.3, 7.7)),
  };
}

/**
 * 원래 정점(월드 좌표, xyz 연속 배열)을 움직인 결과를 out에 쓴다. base는 바꾸지 않는다.
 * 프레임마다 정점 620개를 다루므로 새 배열을 만들지 않고 호출한 쪽의 out 버퍼에 쓴다 (useFrame 할당 금지 규칙).
 */
export function deformFlamePositions(
  base: ArrayLike<number>,
  out: Float32Array,
  shape: FlameShape,
  motion: FlameMotion,
  config: FlameMotionConfig,
  timeSec: number,
): void {
  const height = shape.topY - shape.baseY;
  // 늘어날 때 조금 가늘어지고 줄어들 때 조금 퍼진다 (부피감 유지, 높이 비율에 비례)
  const narrowing = (motion.stretch - 1) * 0.5;

  for (let i = 0; i < base.length; i += 3) {
    const x = base[i];
    const y = base[i + 1];
    const z = base[i + 2];
    const ratio = height > 0 ? (y - shape.baseY) / height : 0;
    if (ratio <= 0) {
      out[i] = x;
      out[i + 1] = y;
      out[i + 2] = z;
      continue;
    }
    const bend = ratio * ratio;
    const dx = x - shape.centerX;
    const dz = z - shape.centerZ;
    const radial = 1 - narrowing * Math.min(ratio, 1);
    // 갈래마다 위상이 다르게: 중심축 둘레 각도와 높이로 위상을 정한다
    const angle = Math.atan2(dz, dx);
    // 위상이 높이와 함께 늦어진다(− ratio) → 떨림 물결이 아래에서 위로 올라간다
    const flutter = config.flutter * bend * Math.sin(timeSec * 7.3 + angle * 3 - ratio * 5);

    out[i] = shape.centerX + dx * radial + motion.swayX * bend + Math.cos(angle) * flutter;
    out[i + 1] = shape.baseY + (y - shape.baseY) * motion.stretch;
    out[i + 2] = shape.centerZ + dz * radial + motion.swayZ * bend + Math.sin(angle) * flutter;
  }
}
