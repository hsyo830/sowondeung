// 점화한 천등의 밝기 흔들림과 점화 연출, 발광 색 계산 (SPEC §5 조명·발광). 모두 순수 함수다 (시간은 인자로 받는다).

import { smoothstep01 } from "./camera";
import { wobble } from "./campfire";

/** WorldConfig `LANTERN_GLOW_CONFIG.glow` */
export interface LanternGlowSettings {
  /** 밝기 흔들림 비율 (0.08 → 0.92~1.08배) */
  flicker: number;
  /** 흔들림 속도 배율 */
  flickerRate: number;
  /** 점화 직후 0에서 기본 밝기까지 올라오는 시간 */
  igniteRiseSec: number;
  /** 점화 직후 잠깐 더해지는 밝기 (기본 대비 비율) */
  igniteBoost: number;
  /** 더해진 밝기가 줄어드는 시간 상수 */
  igniteDecaySec: number;
}

/**
 * 천등 밝기 배율. 1 ≈ 불이 안정된 기본 밝기이고, 종이 emissive와 손 천등 pointLight에 같은 값을 곱한다.
 * - 흔들림: 모닥불과 같은 `wobble`(사인 3개 합)이라 짧은 주기로 반복되지 않는다. seed로 인스턴스마다 위상을 다르게 준다.
 * - secSinceLit이 null이면 점화 연출 없이 흔들림만 (발사 천등: 이미 타고 있는 상태로 시작한다).
 * - 점화 직후: 0에서 igniteRiseSec 동안 올라오며 (1 + igniteBoost)까지 밝아졌다가, 지수적으로 기본 밝기로 돌아온다.
 * 음수가 되지 않는다.
 */
export function getLanternGlow(
  timeSec: number,
  secSinceLit: number | null,
  seed: number,
  settings: LanternGlowSettings,
): number {
  const flicker = 1 + settings.flicker * wobble(timeSec * settings.flickerRate, seed);
  if (secSinceLit === null) return flicker;

  const t = Math.max(0, secSinceLit);
  const ramp = settings.igniteRiseSec > 0 ? smoothstep01(t / settings.igniteRiseSec) : 1;
  const afterPeak = Math.max(0, t - settings.igniteRiseSec);
  const flash =
    settings.igniteBoost *
    ramp *
    (settings.igniteDecaySec > 0 ? Math.exp(-afterPeak / settings.igniteDecaySec) : 0);
  return Math.max(0, ramp * flicker + flash);
}

function parseHex(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function toHex(channels: readonly [number, number, number]): string {
  return `#${channels
    .map((channel) =>
      Math.round(Math.min(Math.max(channel, 0), 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/**
 * 두 sRGB HEX(#rrggbb)의 채널별 곱. 앞면은 텍스처(종이색 + 글씨) × emissive 색으로 빛나므로,
 * 옆면 emissive를 '종이색 × 같은 색'으로 두면 다섯 면이 같은 색으로 빛난다.
 * 검정 글씨는 무엇을 곱해도 검정이라 점화 후에도 글씨가 그대로 보인다.
 */
export function multiplyHex(a: string, b: string): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return toHex([(ar * br) / 255, (ag * bg) / 255, (ab * bb) / 255]);
}
