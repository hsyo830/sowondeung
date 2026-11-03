// 발사된 천등의 궤적·제거 조건과 발사 순간의 출발 정보 (SPEC §5 발사 연출). 모두 순수 함수다.
// useFrame은 경과 시간을 누적해서 이 함수들의 결과를 ref(Object3D)에 쓰기만 한다.

import type { FlyingLanternData, LaunchPose, Vec2, Vec3 } from "@/types/game";

import { smoothstep01 } from "./camera";

export const FLIGHT_RISE_SPEED = 1.6;
export const FLIGHT_SWAY_AMPLITUDE = 0.25;
export const FLIGHT_SWAY_FREQUENCY_HZ = 0.35;
export const FLIGHT_SPIN_SPEED_RAD_PER_SEC = 0.4;
/** 프레임 delta 상한. 탭이 비활성화됐다 돌아올 때 한 프레임에 크게 튀지 않게 한다 */
export const MAX_DELTA_SEC = 0.1;

/** SPEC §5 [결정] 제거 조건: 높이 > 40 또는 경과 > 20초 */
export const MAX_FLIGHT_HEIGHT = 40;
export const MAX_FLIGHT_SEC = 20;
/** SPEC §5 [결정] 동시에 존재하는 발사 천등은 최대 5개. 넘으면 가장 오래된 것부터 제거한다 */
export const MAX_FLYING_LANTERNS = 5;

/** 궤적의 모양. 게임 값은 WorldConfig `FLYING_LANTERN_CONFIG.flight` */
export interface FlightProfile {
  /** 최고 상승 속도 (월드 단위/초) */
  riseSpeed: number;
  swayAmplitude: number;
  swayFrequencyHz: number;
  spinSpeedRadPerSec: number;
  /** 0이면 출발 순간부터 최고 속도(1단계 랩). 0보다 크면 이 시간 상수로 속도가 0에서 부드럽게 올라온다 */
  easeInSec: number;
  /** 바깥으로 흘러가는 이동(drift)이 끝나는 시간. 0이면 흘러가지 않는다 */
  driftSec: number;
}

/** 1단계 랩(`/lab/lantern`)의 궤적. 기존 동작을 그대로 유지하기 위한 기본값이다 */
export const LAB_FLIGHT_PROFILE: FlightProfile = {
  riseSpeed: FLIGHT_RISE_SPEED,
  swayAmplitude: FLIGHT_SWAY_AMPLITUDE,
  swayFrequencyHz: FLIGHT_SWAY_FREQUENCY_HZ,
  spinSpeedRadPerSec: FLIGHT_SPIN_SPEED_RAD_PER_SEC,
  easeInSec: 0,
  driftSec: 0,
};

/**
 * 가속 구간을 반영한 '실제로 이동한 시간'. 속도가 1 − e^(−t/τ)로 0에서 1까지 오를 때 그 적분이다.
 * τ = 0이면 t 그대로. 0초에 값·기울기(속도)가 모두 0이라 출발 순간 튀지 않는다.
 */
export function getEasedTime(elapsedSec: number, easeInSec: number): number {
  if (easeInSec <= 0) return elapsedSec;
  return elapsedSec - easeInSec * (1 - Math.exp(-elapsedSec / easeInSec));
}

/** 출발 지점 기준 상승 높이 */
export function getRiseOffset(
  elapsedSec: number,
  profile: FlightProfile = LAB_FLIGHT_PROFILE,
): number {
  return getEasedTime(elapsedSec, profile.easeInSec) * profile.riseSpeed;
}

/** 좌우 흔들림 (sin). 0초에 0이라 출발 위치에서 튀지 않는다. 가속 구간 동안 진폭도 0에서 커진다 */
export function getSwayOffset(
  elapsedSec: number,
  profile: FlightProfile = LAB_FLIGHT_PROFILE,
): number {
  const envelope = profile.easeInSec > 0 ? smoothstep01(elapsedSec / profile.easeInSec) : 1;
  return (
    Math.sin(elapsedSec * profile.swayFrequencyHz * Math.PI * 2) * profile.swayAmplitude * envelope
  );
}

/** 출발 각도 기준 Y축 회전량 (rad) */
export function getSpinAngle(
  elapsedSec: number,
  profile: FlightProfile = LAB_FLIGHT_PROFILE,
): number {
  return getEasedTime(elapsedSec, profile.easeInSec) * profile.spinSpeedRadPerSec;
}

/** drift 이동의 진행률 0~1 (부드럽게 시작하고 멈춘다). driftSec이 0이면 1 */
export function getDriftProgress(elapsedSec: number, profile: FlightProfile): number {
  if (profile.driftSec <= 0) return 1;
  return smoothstep01(elapsedSec / profile.driftSec);
}

interface MutablePoint3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 발사 천등 중심의 월드 위치 (출발 후 elapsedSec). 결과를 out에 쓴다 (매 프레임 호출, 새 객체 없음).
 * FlyingLantern(그리기)과 CameraRig(발사 연출 시선)가 **같은 함수·같은 입력**을 써서, 카메라가 Three 객체를 공유하지 않고도
 * 천등이 지금 어디 있는지 안다. 궤적을 바꾸려면 이 함수 하나만 바꾸면 된다.
 */
export function getFlyingLanternPosition(
  spawn: Vec3,
  drift: Vec2,
  elapsedSec: number,
  profile: FlightProfile,
  out: MutablePoint3,
): void {
  const driftProgress = getDriftProgress(elapsedSec, profile);
  out.x = spawn[0] + drift[0] * driftProgress + getSwayOffset(elapsedSec, profile);
  out.y = spawn[1] + getRiseOffset(elapsedSec, profile);
  out.z = spawn[2] + drift[1] * driftProgress;
}

/** 프레임 delta를 상한으로 자른다 */
export function clampDelta(deltaSec: number): number {
  return Math.min(Math.max(deltaSec, 0), MAX_DELTA_SEC);
}

/** 월드 높이(y)나 경과 시간이 한도를 넘으면 제거 대상 */
export function shouldRemoveFlyingLantern(worldY: number, elapsedSec: number): boolean {
  return worldY > MAX_FLIGHT_HEIGHT || elapsedSec > MAX_FLIGHT_SEC;
}

/**
 * 발사 천등 목록에 하나를 더한다. 최대 개수를 넘으면 앞(가장 오래된 것)부터 버린다.
 * 같은 id가 이미 있으면 먼저 빼서 중복 인스턴스(같은 React key)가 생기지 않게 한다. 입력 배열은 바꾸지 않는다.
 */
export function appendFlyingLantern(
  flying: readonly FlyingLanternData[],
  lantern: FlyingLanternData,
  maxCount: number = MAX_FLYING_LANTERNS,
): FlyingLanternData[] {
  const next = [...flying.filter((item) => item.id !== lantern.id), lantern];
  return next.slice(Math.max(0, next.length - maxCount));
}

/** 발사 천등 목록에서 id 하나를 뺀다. 없으면 null (상태 변화 없음 → 두 번 제거해도 안전하다) */
export function removeFlyingLanternById(
  flying: readonly FlyingLanternData[],
  id: string,
): FlyingLanternData[] | null {
  if (!flying.some((item) => item.id === id)) return null;
  return flying.filter((item) => item.id !== id);
}

/** 발사 출발 위치 보정 기준. 게임 값은 WorldConfig `FLYING_LANTERN_CONFIG.launch` */
export interface LaunchClearance {
  /** 출발 중심의 최소 높이 (지면 기준) */
  minHeightAboveGround: number;
  /** 출발 중심과 캐릭터 중심 사이 최소 수평 거리 */
  minBodyDistance: number;
  /** 상승 초반에 흘러가 닿을 수평 거리 (머리를 피하는 거리) */
  clearDistance: number;
}

interface Point3 {
  x: number;
  y: number;
  z: number;
}

/** 캐릭터 기준 오른쪽(천등을 든 손 쪽) 수평 단위 벡터. 모델 로컬 -x를 yaw만큼 돌린 방향이다 */
export function getRightHandDirection(yaw: number): Vec2 {
  return [-Math.cos(yaw), Math.sin(yaw)];
}

/**
 * 손에 든 천등의 실제 월드 위치(lantern)에서 발사 출발 정보를 만든다.
 * 1. 출발 높이: 지면(player.y) + minHeightAboveGround보다 낮으면 그 높이로 올린다 (바닥 아래에서 시작하지 않음).
 * 2. 출발 수평 위치: 캐릭터 중심에서 minBodyDistance보다 가까우면 바깥으로 민다 (몸속에서 시작하지 않음).
 *    천등이 중심과 거의 겹치면 방향을 알 수 없으므로 캐릭터 오른쪽(yaw 기준)으로 민다.
 * 3. drift: 출발 후 clearDistance까지 바깥으로 흘러갈 수평 이동량. 손 옆에서 그대로 오르면 큰 머리를 뚫는다.
 * 평소(손 천등이 몸 옆, 지면 위 0.4 이상)에는 1·2가 적용되지 않아 출발 위치가 손에 든 위치와 정확히 같다.
 */
export function getLaunchPose(
  lantern: Readonly<Point3>,
  player: Readonly<Point3>,
  yaw: number,
  clearance: LaunchClearance,
): LaunchPose {
  const dx = lantern.x - player.x;
  const dz = lantern.z - player.z;
  const distance = Math.hypot(dx, dz);
  const [dirX, dirZ] =
    distance > 1e-6 ? [dx / distance, dz / distance] : getRightHandDirection(yaw);

  const startDistance = Math.max(distance, clearance.minBodyDistance);
  const isPushed = startDistance > distance;
  const x = isPushed ? player.x + dirX * startDistance : lantern.x;
  const z = isPushed ? player.z + dirZ * startDistance : lantern.z;
  const y = Math.max(lantern.y, player.y + clearance.minHeightAboveGround);

  const driftDistance = Math.max(0, clearance.clearDistance - startDistance);
  return { spawn: [x, y, z], yaw, drift: [dirX * driftDistance, dirZ * driftDistance] };
}
