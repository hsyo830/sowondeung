"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

import { smoothstep01, stepViewBlend } from "@/lib/game/camera";
import { clampDelta } from "@/lib/game/flight";
import { getDampFactor } from "@/lib/game/movement";
import { CAMERA_CONFIG, WRITING_VIEW } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";
import type { PlayerState } from "@/types/game";

// useFrame에서 매 프레임 새로 만들지 않도록 모듈에 하나만 둔다 (CODING_CONVENTIONS §7)
const desiredPosition = new Vector3();
const lookTarget = new Vector3();
/** 3인칭 추적 카메라의 위치. 작성 시점으로 전환하는 동안에도 계속 플레이어를 따라간다 */
const followPosition = new Vector3();
const WRITING_POSITION = new Vector3(...WRITING_VIEW.cameraPosition);
const WRITING_LOOK_AT = new Vector3(...WRITING_VIEW.lookAt);

interface CameraRigProps {
  playerRef: RefObject<PlayerState>;
}

/**
 * 카메라는 이것 하나다 (SPEC §4). 모드에 따라 목표만 바꾼다.
 * - 3인칭(EXPLORE·COLOR_SELECT): 플레이어 위치 + 고정 월드 오프셋을 부드럽게 따라간다. 캐릭터가 돌아도 카메라는 돌지 않는다.
 * - 작성(WRITING): 테이블 위에서 상판을 내려다보는 1인칭 시점.
 * - 전환: 0(3인칭) ~ 1(작성) 진행률로 두 시점 사이를 위치·시선 모두 보간한다. 진행률이 정확히 0이면
 *   2단계와 같은 계산만 하므로 탐색 중 카메라 동작은 바뀌지 않는다.
 */
export function CameraRig({ playerRef }: CameraRigProps) {
  const hasSnappedRef = useRef(false);
  const viewBlendRef = useRef(0);

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
