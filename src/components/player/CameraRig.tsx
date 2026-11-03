"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

import { getDampFactor } from "@/lib/game/movement";
import { CAMERA_CONFIG } from "@/lib/game/worldConfig";
import type { PlayerState } from "@/types/game";

// useFrame에서 매 프레임 새로 만들지 않도록 모듈에 하나만 둔다 (CODING_CONVENTIONS §7)
const desiredPosition = new Vector3();
const lookTarget = new Vector3();

interface CameraRigProps {
  playerRef: RefObject<PlayerState>;
}

/**
 * 3인칭 추적 카메라 (SPEC §4). 플레이어 위치 + 고정 월드 오프셋을 부드럽게 따라간다.
 * 캐릭터가 돌아도 카메라는 돌지 않는다. 카메라는 이것 하나만 두고, 3단계 WRITING 시점도 여기서 바꾼다.
 */
export function CameraRig({ playerRef }: CameraRigProps) {
  const hasSnappedRef = useRef(false);

  useFrame(({ camera }, delta) => {
    const player = playerRef.current;
    const [offsetX, offsetY, offsetZ] = CAMERA_CONFIG.offset;
    const [lookX, lookY, lookZ] = CAMERA_CONFIG.lookAtOffset;
    desiredPosition.set(player.x + offsetX, player.y + offsetY, player.z + offsetZ);

    if (hasSnappedRef.current) {
      camera.position.lerp(desiredPosition, getDampFactor(CAMERA_CONFIG.followRate, delta));
    } else {
      // 첫 프레임은 바로 제자리에 둔다 (원점에서 날아오는 연출 방지)
      camera.position.copy(desiredPosition);
      hasSnappedRef.current = true;
    }
    // 시선은 보간된 카메라 위치가 아니라 실제 플레이어를 본다. 그래서 캐릭터가 화면 중앙에서 벗어나지 않는다.
    lookTarget.set(player.x + lookX, player.y + lookY, player.z + lookZ);
    camera.lookAt(lookTarget);
  });

  return null;
}
