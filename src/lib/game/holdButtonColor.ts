// '소원등 날리기' 홀드 버튼의 배경색. 진행률(0~1)에 따라 기본색에서 목표색으로 RGBA를 선형 보간한다.

export interface Rgba {
  r: number;
  g: number;
  b: number;
  /** 0~1 */
  a: number;
}

/** 누르기 전 버튼 배경 (기존 Tailwind `bg-[#1d1426]/80`과 같은 값) */
export const LAUNCH_BUTTON_BASE_COLOR: Rgba = { r: 0x1d, g: 0x14, b: 0x26, a: 0.8 };
/** 100%일 때 버튼 배경 (#705711, 불투명) */
export const LAUNCH_BUTTON_FULL_COLOR: Rgba = { r: 0x70, g: 0x57, b: 0x11, a: 1 };

/** progress는 0~1로 자른다. RGB 채널은 정수로 반올림한다 */
export function mixRgba(from: Rgba, to: Rgba, progress: number): Rgba {
  const t = Math.min(1, Math.max(0, progress));
  return {
    r: Math.round(from.r + (to.r - from.r) * t),
    g: Math.round(from.g + (to.g - from.g) * t),
    b: Math.round(from.b + (to.b - from.b) * t),
    a: from.a + (to.a - from.a) * t,
  };
}

export function toCssRgba({ r, g, b, a }: Rgba): string {
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

/** 진행률에 맞는 버튼 배경 CSS 색 */
export function getLaunchButtonColor(progress: number): string {
  return toCssRgba(mixRgba(LAUNCH_BUTTON_BASE_COLOR, LAUNCH_BUTTON_FULL_COLOR, progress));
}
