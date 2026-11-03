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

/** 발사 연출 시간 (WorldConfig `CAMERA_CONFIG.launchLook`) */
export interface LaunchLookTiming {
  /** 발사 후 기존 3인칭 시선을 그대로 유지하는 시간 (천등은 이 동안에도 오른다) */
  delaySec: number;
  /** 대기 후 천등을 따라 보는 시간 (easeInSec 포함) */
  followSec: number;
  /** 추적 시작 시 0 → 1로 부드럽게 옮겨 가는 시간 (followSec 안) */
  easeInSec: number;
  /** 캐릭터 중심 시선으로 돌아오는 시간 */
  returnSec: number;
}

/**
 * 발사 연출의 세기 0~1 (발사 후 경과 시간 기준).
 * 대기(0) → 옮겨 감(smoothstep 0 → 1) → 따라 봄(1) → 복귀(smoothstep 1 → 0).
 * 대기 끝·연출 끝에서 값과 기울기가 모두 0이라 시선이 튀지 않는다. 연출이 끝나면 정확히 0이다.
 */
export function getLaunchLookWeight(elapsedSec: number, timing: LaunchLookTiming): number {
  const { delaySec, followSec, easeInSec, returnSec } = timing;
  const t = elapsedSec - delaySec;
  if (t <= 0) return 0;
  if (t < easeInSec) return smoothstep01(t / easeInSec);
  if (t < followSec) return 1;
  if (returnSec <= 0) return 0;
  return 1 - smoothstep01((t - followSec) / returnSec);
}

/** 연출 전체 길이 (대기 + 추적 + 복귀) */
export function getLaunchLookDuration(timing: LaunchLookTiming): number {
  return timing.delaySec + timing.followSec + timing.returnSec;
}

/**
 * 연출 중에 새로 발사했을 때 이어서 쓸 경과 시간. **지금 세기를 그대로 유지**한다.
 * - 대기 중(세기 0): 대기를 처음부터 다시 센다
 * - 옮겨 가는 중: 그대로
 * - 따라 보는 중: 따라 보는 구간의 처음으로 (새 천등을 처음부터 따라 본다)
 * - 돌아오는 중(세기 w): 옮겨 가는 구간에서 세기가 w인 시점 (smoothstep의 역함수)
 * - 연출 없음: 0
 */
export function getLaunchLookRestartSec(elapsedSec: number, timing: LaunchLookTiming): number {
  const { delaySec, followSec, easeInSec } = timing;
  const t = elapsedSec - delaySec;
  if (t <= 0) return 0;
  if (t <= easeInSec) return elapsedSec;
  if (t < followSec) return delaySec + easeInSec;
  const weight = getLaunchLookWeight(elapsedSec, timing);
  if (weight <= 0) return 0;
  // y = 3x² − 2x³ 의 역함수
  const x = 0.5 - Math.sin(Math.asin(1 - 2 * weight) / 3);
  return delaySec + x * easeInSec;
}

/** 발사 연출 시선 높이 설정 (WorldConfig `CAMERA_CONFIG.launchLook`) */
export interface LaunchFocusSettings {
  lookLift: number;
  extraPitchDeg: number;
  lanternAboveCenter: number;
  maxLanternOffsetDeg: number;
}

/**
 * 발사 연출에서 시선점의 높이. 카메라에서 수평 거리 horizontalDistance만큼 떨어진 천등 쪽 지점을 볼 때,
 * 각도로 계산해 높이로 돌려준다.
 * 1. 기본 각도 = 평소 시선점 높이 + lookLift를 보는 각도 + extraPitchDeg
 * 2. 추적 각도 = 천등보다 lanternAboveCenter 아래를 보는 각도 (천등이 화면 중앙보다 살짝 위)
 * 3. 둘 중 높은 각도를 천등 방향 ± maxLanternOffsetDeg 안으로 자른다 → 천등이 화면 위·아래로 나가지 않는다.
 */
export function getLaunchFocusHeight(
  cameraY: number,
  horizontalDistance: number,
  baseLookY: number,
  lanternY: number,
  settings: LaunchFocusSettings,
): number {
  const distance = Math.max(horizontalDistance, 1e-3);
  const angleTo = (y: number) => Math.atan2(y - cameraY, distance);
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const lanternAngle = angleTo(lanternY);
  const baseAngle = angleTo(baseLookY + settings.lookLift) + toRad(settings.extraPitchDeg);
  const followAngle = angleTo(lanternY - settings.lanternAboveCenter);
  const maxOffset = toRad(settings.maxLanternOffsetDeg);
  const angle = Math.min(
    Math.max(Math.max(baseAngle, followAngle), lanternAngle - maxOffset),
    lanternAngle + maxOffset,
  );
  return cameraY + distance * Math.tan(angle);
}

/** smoothDamp가 프레임마다 이어서 쓰는 값과 속도 (호출한 쪽이 소유하고 재사용한다) */
export interface DampState {
  value: number;
  velocity: number;
}

/**
 * 임계 감쇠 스프링으로 value를 target 쪽으로 옮긴다 (state를 직접 갱신, 매 프레임 새 객체 없음).
 * - 속도가 0에서 부드럽게 붙고(가속), 목표 근처에서 부드럽게 멈춘다(감속). 목표가 바뀌어도 지금 값·속도에서 이어진다.
 * - 한 프레임 이동량을 maxSpeed × dt로, 속도를 ±maxSpeed로 **자른다** → 최대 변화 속도를 넘지 않는다.
 * - smoothTime은 목표에 닿는 대략의 시간이다. 목표를 넘어가지 않는다.
 */
export function smoothDamp(
  state: DampState,
  target: number,
  smoothTime: number,
  maxSpeed: number,
  deltaSec: number,
): void {
  if (deltaSec <= 0) return;
  const time = Math.max(smoothTime, 1e-4);
  const omega = 2 / time;
  const x = omega * deltaSec;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const current = state.value;
  const change = current - target;
  const temp = (state.velocity + omega * change) * deltaSec;
  let velocity = (state.velocity - omega * temp) * decay;
  let next = target + (change + temp) * decay;
  // 목표를 넘어가지 않는다
  if (target - current > 0 === next > target) {
    next = target;
    velocity = 0;
  }
  // 최대 변화 속도 제한
  const maxStep = maxSpeed * deltaSec;
  next = current + Math.min(Math.max(next - current, -maxStep), maxStep);
  velocity = Math.min(Math.max(velocity, -maxSpeed), maxSpeed);
  state.value = next;
  state.velocity = velocity;
}
