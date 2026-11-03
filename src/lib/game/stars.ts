// 초저녁 하늘의 희미한 별 배치. 순수 함수다 (난수는 시드로 정해져 매번 같은 하늘이 나온다).
//
// 별은 하늘 배경막(카메라 중심 원통) 바로 안쪽 원통면에 놓인다. 화면에 그릴 때는 깊이 테스트를 켜서
// 나무·바위·캐릭터처럼 더 가까운 물체가 별을 가린다 (SkyBackdrop). 높이는 바닥이 배경막과 만나는 높이보다 한참 위라
// 잔디·지면 쪽에는 별이 생길 수 없다.

/** 별 배치 설정 (WorldConfig) */
export interface SkyStarsConfig {
  count: number;
  /** 별이 놓이는 원통 반지름 (배경막보다 조금 안쪽) */
  radius: number;
  /** 이 높이 아래에는 별이 없다 (분홍·복숭아 노을 띠 위) */
  minY: number;
  /** 평소 3인칭 화면 위쪽에 보이는 낮은 띠의 위 끝 */
  lowBandMaxY: number;
  /** 별이 놓이는 가장 높은 곳 (발사 연출에서 올려다볼 때) */
  maxY: number;
  /** 낮은 띠(minY~lowBandMaxY)에 놓는 별의 비율. 나머지는 그 위 */
  lowBandShare: number;
  /** 별빛 세기 범위 (0 = 하늘색 그대로, 1 = 별 색 그대로) */
  minStrength: number;
  maxStrength: number;
  /** 크기 단계별 비율 (합 1). 작은 별이 대부분이다 */
  sizeShares: readonly number[];
  /** 색 종류 수 (크림빛·연보라빛 등) */
  tintCount: number;
  seed: number;
}

export interface SkyStar {
  x: number;
  y: number;
  z: number;
  /** 별빛 세기 (minStrength~maxStrength) */
  strength: number;
  /** sizeShares의 단계 번호 */
  sizeIndex: number;
  /** 색 번호 (0 ~ tintCount − 1) */
  tintIndex: number;
}

/** 시드 고정 난수 (mulberry32). [0, 1) */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 방위각별 별 밀도 (0.15~1). 서로 다른 주기의 사인 3개라 별이 고르게 깔리지 않고 성긴 곳과 모인 곳이 생긴다.
 */
export function getStarDensity(angle: number, y: number): number {
  const value =
    Math.sin(angle * 3 + 0.7) * 0.5 +
    Math.sin(angle * 7 + y * 0.35 + 2.1) * 0.3 +
    Math.sin(angle * 13 - y * 0.6 + 4.4) * 0.2;
  return 0.15 + 0.85 * ((value + 1) / 2);
}

function pickIndex(shares: readonly number[], random: number): number {
  let total = 0;
  for (let i = 0; i < shares.length; i++) {
    total += shares[i];
    if (random < total) return i;
  }
  return shares.length - 1;
}

/**
 * 별 목록. 방위각은 밀도(getStarDensity)에 비례해 뽑아(거절 표본) 자연스럽게 흩어지고,
 * 높이는 낮은 띠와 그 위로 나눠 평소 화면에도 몇 개가 보이게 한다. 세기는 대부분 약하고 드물게 조금 밝다.
 */
export function createSkyStars(config: SkyStarsConfig): SkyStar[] {
  const random = createRandom(config.seed);
  const stars: SkyStar[] = [];
  while (stars.length < config.count) {
    const angle = random() * Math.PI * 2;
    const isLow = random() < config.lowBandShare;
    const y = isLow
      ? config.minY + random() * (config.lowBandMaxY - config.minY)
      : config.lowBandMaxY + random() * (config.maxY - config.lowBandMaxY);
    if (random() > getStarDensity(angle, y)) continue;

    // 제곱으로 약한 별이 많게 한다
    const brightness = random() ** 2;
    stars.push({
      x: Math.cos(angle) * config.radius,
      y,
      z: Math.sin(angle) * config.radius,
      strength: config.minStrength + (config.maxStrength - config.minStrength) * brightness,
      sizeIndex: pickIndex(config.sizeShares, random()),
      tintIndex: Math.min(config.tintCount - 1, Math.floor(random() * config.tintCount)),
    });
  }
  return stars;
}
