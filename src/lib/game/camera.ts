// 카메라 시점 전환 (SPEC §4: 카메라는 하나, 모드에 따라 목표만 바꾼다). 순수 함수다.

/** current를 target 쪽으로 최대 maxStep만큼 옮긴다. 넘어가지 않고 정확히 target에서 멈춘다 */
export function stepToward(current: number, target: number, maxStep: number): number {
  if (current < target) return Math.min(current + maxStep, target);
  return Math.max(current - maxStep, target);
}

/** 0~1 구간의 부드러운 가감속 (smoothstep). 범위 밖 입력은 0·1로 자른다 */
export function smoothstep01(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
}

/**
 * 3인칭(0) ↔ 작성 시점(1) 전환 진행률을 한 프레임 진행시킨다.
 * 고정 시간(transitionSec) 동안 선형으로 움직이고 끝에서 정확히 0·1이 된다.
 * 그래서 3인칭으로 완전히 돌아오면 2단계와 똑같은 카메라 동작이 된다.
 */
export function stepViewBlend(
  current: number,
  isWriting: boolean,
  deltaSec: number,
  transitionSec: number,
): number {
  const target = isWriting ? 1 : 0;
  if (transitionSec <= 0) return target;
  return stepToward(current, target, deltaSec / transitionSec);
}
