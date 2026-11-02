// 발사된 천등의 궤적과 제거 조건 (SPEC §5 발사 연출). 모두 경과 시간만으로 결정되는 순수 함수다.
// useFrame은 경과 시간을 누적해서 이 함수들의 결과를 ref(Object3D)에 쓰기만 한다.

export const FLIGHT_RISE_SPEED = 1.6;
export const FLIGHT_SWAY_AMPLITUDE = 0.25;
export const FLIGHT_SWAY_FREQUENCY_HZ = 0.35;
export const FLIGHT_SPIN_SPEED_RAD_PER_SEC = 0.4;
/** 프레임 delta 상한. 탭이 비활성화됐다 돌아올 때 한 프레임에 크게 튀지 않게 한다 */
export const MAX_DELTA_SEC = 0.1;

/** SPEC §5 [결정] 제거 조건: 높이 > 40 또는 경과 > 20초 */
export const MAX_FLIGHT_HEIGHT = 40;
export const MAX_FLIGHT_SEC = 20;

/** 출발 지점 기준 상승 높이 */
export function getRiseOffset(elapsedSec: number): number {
  return elapsedSec * FLIGHT_RISE_SPEED;
}

/** 좌우 흔들림 (sin). 0초에 0이라 출발 위치에서 튀지 않는다 */
export function getSwayOffset(elapsedSec: number): number {
  return Math.sin(elapsedSec * FLIGHT_SWAY_FREQUENCY_HZ * Math.PI * 2) * FLIGHT_SWAY_AMPLITUDE;
}

/** Y축 회전 각도 (rad) */
export function getSpinAngle(elapsedSec: number): number {
  return elapsedSec * FLIGHT_SPIN_SPEED_RAD_PER_SEC;
}

/** 프레임 delta를 상한으로 자른다 */
export function clampDelta(deltaSec: number): number {
  return Math.min(Math.max(deltaSec, 0), MAX_DELTA_SEC);
}

/** 월드 높이(y)나 경과 시간이 한도를 넘으면 제거 대상 */
export function shouldRemoveFlyingLantern(worldY: number, elapsedSec: number): boolean {
  return worldY > MAX_FLIGHT_HEIGHT || elapsedSec > MAX_FLIGHT_SEC;
}
