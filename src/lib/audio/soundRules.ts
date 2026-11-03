// 효과음을 언제·어떻게 재생할지 정하는 순수 함수. 시간·난수는 인자로 받는다 (CODING_CONVENTIONS §6).

import type { FootstepSegment } from "@/constants/audio";
import type { FlyingLanternData, GameMode, HeldLantern } from "@/types/game";

/** 게임 상태 변화로 재생하는 효과음 */
export type GameSoundId = "paper" | "ignite" | "launch";

/** 효과음 판정에 필요한 store 값 (GameState의 일부) */
export interface GameSoundSnapshot {
  mode: GameMode;
  held: Pick<HeldLantern, "status" | "colorId">;
  flying: readonly Pick<FlyingLanternData, "id">[];
}

/**
 * 이전 → 다음 store 값에서 재생할 효과음. 이벤트 핸들러가 아니라 **상태 전이 결과**를 보므로
 * 버튼·E키 어느 쪽으로 실행해도 같고, 거부된 전이(상태 변화 없음)에서는 소리가 나지 않는다.
 * - 천등 받기 (NONE → BLANK), 색상 다시 고르기 (BLANK에서 색 변경): 종이
 * - 소원 작성 화면 열기: 종이
 * - 점화 성공 (WRITTEN → LIT): 점화. 이미 LIT이면 전이가 거부되므로 두 번 나지 않는다
 * - 발사: 홀드 완료(LAUNCHING 시작)가 아니라 Throw에서 **실제로 천등이 분리되어** 발사 목록에 새 id가 생긴 순간
 */
export function getGameSoundEvents(
  previous: GameSoundSnapshot,
  next: GameSoundSnapshot,
): GameSoundId[] {
  const sounds: GameSoundId[] = [];
  const wasStatus = previous.held.status;
  const isStatus = next.held.status;

  const received = wasStatus === "NONE" && isStatus === "BLANK";
  const recolored =
    wasStatus === "BLANK" && isStatus === "BLANK" && previous.held.colorId !== next.held.colorId;
  const openedWriting = previous.mode !== "WRITING" && next.mode === "WRITING";
  if (received || recolored || openedWriting) sounds.push("paper");

  if (wasStatus === "WRITTEN" && isStatus === "LIT") sounds.push("ignite");

  if (hasNewFlyingLantern(previous.flying, next.flying)) sounds.push("launch");
  return sounds;
}

function hasNewFlyingLantern(
  previous: readonly Pick<FlyingLanternData, "id">[],
  next: readonly Pick<FlyingLanternData, "id">[],
): boolean {
  if (previous === next || next.length === 0) return false;
  // 새 천등은 항상 끝에 붙는다 (appendFlyingLantern). 오래된 천등이 빠지는 것(제거·최대 개수)은 발사가 아니다
  const newest = next[next.length - 1].id;
  return !previous.some((lantern) => lantern.id === newest);
}

/** 마지막 재생 후 cooldownMs가 지났는가. lastPlayedAt이 null이면 한 번도 재생하지 않은 것 */
export function canPlayAfterCooldown(
  lastPlayedAt: number | null,
  now: number,
  cooldownMs: number,
): boolean {
  return lastPlayedAt === null || now - lastPlayedAt >= cooldownMs;
}

/**
 * 반복 재생하는 클립의 시간이 이전 → 지금 프레임 사이에 지나간 발 디딤 시점 수.
 * 클립 끝에서 처음으로 돌아간 프레임(next < previous)도 센다. 시점은 (previous, next] 구간에 들면 센다.
 * 한 프레임에 클립 한 바퀴 이상을 건너뛰는 경우(긴 멈춤 뒤 첫 프레임)는 delta 상한으로 생기지 않는다고 본다.
 */
export function countFootstepContacts(
  previousSec: number,
  nextSec: number,
  contactSecs: readonly number[],
): number {
  if (nextSec === previousSec) return 0;
  if (nextSec > previousSec) {
    return contactSecs.filter((contact) => contact > previousSec && contact <= nextSec).length;
  }
  return contactSecs.filter((contact) => contact > previousSec || contact <= nextSec).length;
}

/**
 * 다음 걸음 구간 번호. 바로 앞 걸음과 같은 소리를 연속으로 쓰지 않는다.
 * random은 [0, 1) 값이다 (Math.random을 인자로 받는다).
 */
export function pickFootstepIndex(
  previousIndex: number | null,
  count: number,
  random: number,
): number {
  if (count <= 1) return 0;
  if (previousIndex === null || previousIndex < 0 || previousIndex >= count) {
    return Math.min(count - 1, Math.floor(random * count));
  }
  // 앞 걸음을 뺀 count - 1개 중에서 고른다
  const offset = 1 + Math.min(count - 2, Math.floor(random * (count - 1)));
  return (previousIndex + offset) % count;
}

/** 걸음마다 녹음 세기가 달라 목표 세기에 맞추는 배율 (범위 제한) */
export function getFootstepNormalize(
  segment: Pick<FootstepSegment, "peak">,
  targetPeak: number,
  minNormalize: number,
  maxNormalize: number,
): number {
  if (segment.peak <= 0) return maxNormalize;
  return Math.min(maxNormalize, Math.max(minNormalize, targetPeak / segment.peak));
}

/** 기준값 1에서 ±jitter 범위의 배율. random은 [0, 1) */
export function getJitter(jitter: number, random: number): number {
  return 1 + (random * 2 - 1) * jitter;
}

/**
 * 모닥불과의 수평 거리 → 근접도 (0~1). fullDistance 안이면 1, silentDistance 밖이면 0.
 * 그 사이는 제곱으로 줄여 가까이 갈수록 빠르게 커진다 (선형이면 이동 범위 대부분에서 비슷하게 들린다).
 */
export function getCampfireProximity(
  distance: number,
  fullDistance: number,
  silentDistance: number,
): number {
  if (distance <= fullDistance) return 1;
  if (distance >= silentDistance) return 0;
  const ratio = (silentDistance - distance) / (silentDistance - fullDistance);
  return ratio * ratio;
}
