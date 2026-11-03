"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

import {
  getLaunchFocusHeight,
  getLaunchLookDuration,
  getLaunchLookRestartSec,
  getLaunchLookWeight,
  smoothDamp,
  smoothstep01,
  stepViewBlend,
} from "@/lib/game/camera";
import { clampDelta, getFlyingLanternPosition } from "@/lib/game/flight";
import type { DampState } from "@/lib/game/camera";
import type { FlightProfile } from "@/lib/game/flight";
import { getDampFactor } from "@/lib/game/movement";
import { CAMERA_CONFIG, FLYING_LANTERN_CONFIG, WRITING_VIEW } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";
import type { FlyingLanternData, PlayerState } from "@/types/game";

// useFrame에서 매 프레임 새로 만들지 않도록 모듈에 하나만 둔다 (CODING_CONVENTIONS §7)
const desiredPosition = new Vector3();
const lookTarget = new Vector3();
/** 3인칭 추적 카메라의 위치. 작성 시점으로 전환하는 동안에도 계속 플레이어를 따라간다 */
const followPosition = new Vector3();
const WRITING_POSITION = new Vector3(...WRITING_VIEW.cameraPosition);
const WRITING_LOOK_AT = new Vector3(...WRITING_VIEW.lookAt);
/** 따라 보는 발사 천등의 이번 프레임 위치 */
const lanternPosition = new Vector3();
/** 시선이 쫓는 초점. 천등 위치를 지수 감쇠로 따라간다 (천등이 바뀌어도 순간 이동하지 않게) */
const launchFocus = new Vector3();
/** 연출 목표 시선점 (평소 시선점 → 초점을 세기만큼) */
const launchTarget = new Vector3();
const LAUNCH_LOOK = CAMERA_CONFIG.launchLook;
const DEG = Math.PI / 180;
/** 이 이하면 시선 오프셋이 0으로 돌아온 것으로 본다 (약 0.006°) */
const SETTLED_RAD = 1e-4;
const LAUNCH_LOOK_END_SEC = getLaunchLookDuration(LAUNCH_LOOK);
/** FlyingLanterns와 같은 궤적 프로필 → 같은 함수로 같은 위치를 계산한다 */
const FLIGHT_PROFILE: FlightProfile = FLYING_LANTERN_CONFIG.flight;

interface CameraRigProps {
  playerRef: RefObject<PlayerState>;
}

/**
 * 카메라는 이것 하나다 (SPEC §4). 모드에 따라 목표만 바꾼다.
 * - 3인칭(EXPLORE·COLOR_SELECT): 플레이어 위치 + 고정 월드 오프셋을 부드럽게 따라간다. 캐릭터가 돌아도 카메라는 돌지 않는다.
 * - 작성(WRITING): 테이블 위에서 상판을 내려다보는 1인칭 시점.
 * - 전환: 0(3인칭) ~ 1(작성) 진행률로 두 시점 사이를 위치·시선 모두 보간한다. 진행률이 정확히 0이면
 *   2단계와 같은 계산만 하므로 탐색 중 카메라 동작은 바뀌지 않는다.
 * - 발사 연출(4단계): 새 발사 천등이 생기면 위치는 그대로 추적하면서 시선만 **실제로 오르는 그 천등** 쪽으로
 *   옮겨 따라 봤다가 캐릭터 시선으로 돌려놓는다. 연출 세기가 0이면 아무것도 바꾸지 않는다.
 */
export function CameraRig({ playerRef }: CameraRigProps) {
  const hasSnappedRef = useRef(false);
  const viewBlendRef = useRef(0);
  /** 마지막으로 본 발사 천등 id. 목록 끝이 바뀌면 = 새 발사 (오래된 천등 제거는 끝을 바꾸지 않는다) */
  const lastLaunchIdRef = useRef<string | null | undefined>(undefined);
  /** 발사 연출 경과 시간. null = 연출 없음 */
  const launchLookSecRef = useRef<number | null>(null);
  /** 따라 보는 발사 천등의 출발 정보(store 데이터 참조)와 출발 후 경과 시간 */
  const trackedLanternRef = useRef<FlyingLanternData | null>(null);
  const lanternElapsedSecRef = useRef(0);
  /** 평소 시선에서의 위아래(pitch)·좌우(yaw) 오프셋과 그 각속도 (rad). 0이면 기존 3인칭 시선 그대로 */
  const pitchOffsetRef = useRef<DampState>({ value: 0, velocity: 0 });
  const yawOffsetRef = useRef<DampState>({ value: 0, velocity: 0 });

  useFrame(({ camera }, delta) => {
    const player = playerRef.current;
    const [offsetX, offsetY, offsetZ] = CAMERA_CONFIG.offset;
    const [lookX, lookY, lookZ] = CAMERA_CONFIG.lookAtOffset;
    desiredPosition.set(player.x + offsetX, player.y + offsetY, player.z + offsetZ);

    if (hasSnappedRef.current) {
      followPosition.lerp(desiredPosition, getDampFactor(CAMERA_CONFIG.followRate, delta));
    } else {
      // 첫 프레임은 바로 제자리에 둔다 (원점에서 날아오는 연출 방지)
      followPosition.copy(desiredPosition);
      hasSnappedRef.current = true;
    }
    // 시선은 보간된 카메라 위치가 아니라 실제 플레이어를 본다. 그래서 캐릭터가 화면 중앙에서 벗어나지 않는다.
    lookTarget.set(player.x + lookX, player.y + lookY, player.z + lookZ);

    const isWriting = useGameStore.getState().mode === "WRITING";
    const blend = stepViewBlend(
      viewBlendRef.current,
      isWriting,
      clampDelta(delta),
      WRITING_VIEW.transitionSec,
    );
    viewBlendRef.current = blend;

    // 발사 감지: store를 매 프레임 읽기만 한다 (쓰지 않음). 첫 프레임은 기준만 잡는다
    const { flying } = useGameStore.getState();
    const lastLaunchId = flying.length > 0 ? flying[flying.length - 1].id : null;
    if (lastLaunchIdRef.current === undefined) {
      lastLaunchIdRef.current = lastLaunchId;
    } else if (lastLaunchId !== lastLaunchIdRef.current) {
      lastLaunchIdRef.current = lastLaunchId;
      const launched = flying[flying.length - 1];
      if (launched) {
        const current = launchLookSecRef.current;
        trackedLanternRef.current = launched;
        lanternElapsedSecRef.current = 0;
        if (current === null) {
          // 새 연출: 초점을 출발 지점(수평) · 캐릭터 시선 높이에서 시작한다 (이때 세기는 0이라 시선은 아직 캐릭터)
          launchFocus.set(
            launched.spawn[0],
            lookTarget.y + LAUNCH_LOOK.lookLift,
            launched.spawn[2],
          );
          launchLookSecRef.current = 0;
        } else {
          // 연출 중 새 발사: 세기는 이어 가고, 초점은 감쇠로 새 천등까지 옮겨 간다 (튐 없음)
          launchLookSecRef.current = getLaunchLookRestartSec(current, LAUNCH_LOOK);
        }
      }
    }
    const tracked = trackedLanternRef.current;
    const step = clampDelta(delta);
    let targetPitch = 0;
    let targetYaw = 0;
    let isReturning = true;
    const isRunning = launchLookSecRef.current !== null && tracked !== null;
    if (launchLookSecRef.current !== null && tracked) {
      const elapsed = launchLookSecRef.current + step;
      const launchWeight = getLaunchLookWeight(elapsed, LAUNCH_LOOK);
      // FlyingLantern과 같은 함수·같은 출발 정보·같은 경과 시간(clampDelta 누적)으로 지금 천등 위치를 구한다
      lanternElapsedSecRef.current += step;
      getFlyingLanternPosition(
        tracked.spawn,
        tracked.drift,
        lanternElapsedSecRef.current,
        FLIGHT_PROFILE,
        lanternPosition,
      );
      // 수평은 천등의 실제 위치. 높이는 카메라에서 본 각도로 정한다: 평소보다 조금 더 위를 보거나,
      // 천등이 오르면 천등이 화면 중앙보다 살짝 위에 오도록 따라가되, 천등이 화면 밖으로 나가지 않게 자른다.
      lanternPosition.y = getLaunchFocusHeight(
        followPosition.y,
        Math.hypot(lanternPosition.x - followPosition.x, lanternPosition.z - followPosition.z),
        lookTarget.y,
        lanternPosition.y,
        LAUNCH_LOOK,
      );
      launchFocus.lerp(lanternPosition, getDampFactor(LAUNCH_LOOK.focusDampRate, delta));

      // 목표 시선 = 평소 시선점 → 초점을 세기만큼. 이것을 평소 시선에서의 각도 차이로 바꾼다
      launchTarget.copy(lookTarget).lerp(launchFocus, launchWeight);
      isReturning = elapsed >= LAUNCH_LOOK.delaySec + LAUNCH_LOOK.followSec;
      // 복귀 구간에서는 목표를 바로 0(평소 시선)으로 둔다. 목표까지 서서히 줄이면 스프링 지연과 겹쳐
      // 복귀가 약 1.9초로 늘어났다 (headless 측정). 가감속은 스프링 하나가 맡는다
      if (!isReturning) {
        targetPitch = getPitch(launchTarget) - getPitch(lookTarget);
        targetYaw = wrapAngle(getYaw(launchTarget) - getYaw(lookTarget));
      }

      if (elapsed >= LAUNCH_LOOK_END_SEC) {
        launchLookSecRef.current = null;
        trackedLanternRef.current = null;
      } else {
        launchLookSecRef.current = elapsed;
      }
    }

    const pitchOffset = pitchOffsetRef.current;
    const yawOffset = yawOffsetRef.current;
    const hasOffset =
      Math.abs(pitchOffset.value) > SETTLED_RAD ||
      Math.abs(yawOffset.value) > SETTLED_RAD ||
      Math.abs(pitchOffset.velocity) > SETTLED_RAD ||
      Math.abs(yawOffset.velocity) > SETTLED_RAD;
    if (isRunning || hasOffset) {
      // 실제 시선은 목표로 바로 가지 않는다: 가속·감속이 붙은 스프링 + 최대 각속도 제한 (고개를 천천히 드는 느낌).
      // 복귀도 목표가 0이 될 뿐, 지금 각도·속도에서 이어서 돌아온다
      const smoothSec = isReturning ? LAUNCH_LOOK.returnSmoothSec : LAUNCH_LOOK.followSmoothSec;
      const maxTurn =
        (isReturning ? LAUNCH_LOOK.returnMaxTurnDegPerSec : LAUNCH_LOOK.followMaxTurnDegPerSec) *
        DEG;
      smoothDamp(pitchOffset, targetPitch, smoothSec, maxTurn, step);
      smoothDamp(yawOffset, targetYaw, smoothSec, maxTurn, step);
      applyLookOffset(pitchOffset.value, yawOffset.value);
    } else if (pitchOffset.value !== 0 || yawOffset.value !== 0) {
      // 연출이 끝나고 거의 0이 되면 정확히 0으로 → 기존 3인칭 계산 그대로
      pitchOffset.value = 0;
      pitchOffset.velocity = 0;
      yawOffset.value = 0;
      yawOffset.velocity = 0;
    }

    if (blend === 0) {
      camera.position.copy(followPosition);
    } else {
      const t = smoothstep01(blend);
      camera.position.lerpVectors(followPosition, WRITING_POSITION, t);
      lookTarget.lerp(WRITING_LOOK_AT, t);
    }
    camera.lookAt(lookTarget);
  });

  return null;
}

// 발사 연출 시선 계산 보조. 모듈 스크래치 벡터를 읽고 쓴다 (매 프레임 새 객체를 만들지 않는다)

/** 카메라(followPosition)에서 point를 보는 위아래 각도 (rad, 위 +) */
function getPitch(point: Vector3): number {
  const dx = point.x - followPosition.x;
  const dz = point.z - followPosition.z;
  return Math.atan2(point.y - followPosition.y, Math.hypot(dx, dz));
}

/** 카메라(followPosition)에서 point를 보는 좌우 각도 (rad) */
function getYaw(point: Vector3): number {
  return Math.atan2(point.x - followPosition.x, point.z - followPosition.z);
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** lookTarget(평소 시선점)을 카메라 기준으로 pitch·yaw만큼 돌린다. 거리는 그대로라 카메라 위치·화각은 바뀌지 않는다 */
function applyLookOffset(pitchOffset: number, yawOffset: number): void {
  const dx = lookTarget.x - followPosition.x;
  const dy = lookTarget.y - followPosition.y;
  const dz = lookTarget.z - followPosition.z;
  const distance = Math.hypot(dx, dy, dz);
  const pitch = Math.atan2(dy, Math.hypot(dx, dz)) + pitchOffset;
  const yaw = Math.atan2(dx, dz) + yawOffset;
  lookTarget.set(
    followPosition.x + distance * Math.cos(pitch) * Math.sin(yaw),
    followPosition.y + distance * Math.sin(pitch),
    followPosition.z + distance * Math.cos(pitch) * Math.cos(yaw),
  );
}
