// 모닥불 불꽃 일렁임 계산. 순수 함수다 (시간은 인자로 받는다).
//
// 불꽃 메시(GLB `Mball.018`)는 정점 620개짜리 하나의 메시라 본·모프가 없다. 그래서 매 프레임 정점을 직접 옮긴다.
// - 바닥 높이(baseY) 아래 정점은 그대로 둔다 → 불꽃 밑동이 장작에 붙어 있다.
// - 높이 비율의 제곱만큼 옮긴다 → 끝으로 갈수록 크게 휘고, 통째로 기울거나 회전하지 않는다.
// - 주기가 서로 나누어떨어지지 않는 사인 3개를 더해 같은 모양이 짧게 반복되지 않게 한다.

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
  /** 밝기 배율 (1 = 기본). 불꽃 emissive와 pointLight에 곱한다 */
  glow: number;
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
    const flutter = config.flutter * bend * Math.sin(timeSec * 7.3 + angle * 3 + ratio * 4);

    out[i] = shape.centerX + dx * radial + motion.swayX * bend + Math.cos(angle) * flutter;
    out[i + 1] = shape.baseY + (y - shape.baseY) * motion.stretch;
    out[i + 2] = shape.centerZ + dz * radial + motion.swayZ * bend + Math.sin(angle) * flutter;
  }
}
