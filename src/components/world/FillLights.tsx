"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";
import type { PointLight } from "three";

import { FILL_LIGHT_CONFIG } from "@/lib/game/worldConfig";
import type { PlayerState } from "@/types/game";

interface FillLightsProps {
  playerRef: RefObject<PlayerState>;
}

/**
 * 캐릭터·탁자 보조 조명 (FILL_LIGHT_CONFIG). Suspense 밖에서 처음부터 마운트해 라이트 수가 바뀌지 않는다 (셰이더 재컴파일 없음).
 * 캐릭터 fill은 캐릭터 그룹 밖(씬 루트)에 두고 매 프레임 위치만 따라간다. 작성 모드에서 캐릭터 그룹이 숨겨져도
 * 라이트가 렌더 목록에서 빠지지 않는다 (HeldLanternLight와 같은 이유).
 * 그림자는 만들지 않는다 (castShadow false 명시). 씬은 그림자를 쓰지 않고, pointLight 그림자는 6면 렌더가 더 필요하다.
 */
export function FillLights({ playerRef }: FillLightsProps) {
  const characterLightRef = useRef<PointLight>(null);
  const { character, table } = FILL_LIGHT_CONFIG;

  useFrame(() => {
    const light = characterLightRef.current;
    if (!light) return;
    const player = playerRef.current;
    light.position.set(
      player.x + character.offset[0],
      player.y + character.offset[1],
      player.z + character.offset[2],
    );
  });

  return (
    <>
      <pointLight
        ref={characterLightRef}
        color={character.color}
        intensity={character.intensity}
        distance={character.distance}
        decay={character.decay}
        castShadow={false}
      />
      <pointLight
        position={table.position}
        color={table.color}
        intensity={table.intensity}
        distance={table.distance}
        decay={table.decay}
        castShadow={false}
      />
    </>
  );
}
