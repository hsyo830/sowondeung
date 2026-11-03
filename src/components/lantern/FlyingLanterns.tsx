"use client";

import { FlyingLantern } from "@/components/lantern/FlyingLantern";
import type { FlyingLanternGlow } from "@/components/lantern/FlyingLantern";
import { getLanternColorHex } from "@/constants/lanternColors";
import type { FlightProfile } from "@/lib/game/flight";
import {
  FLYING_LANTERN_CONFIG,
  HELD_LANTERN_CONFIG,
  LANTERN_GLOW_CONFIG,
} from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";

const GAME_FLIGHT_PROFILE: FlightProfile = FLYING_LANTERN_CONFIG.flight;

/** 인스턴스마다 흔들림 위상을 다르게 한다. id(`lantern-N`)의 번호에서 만들어 렌더마다 같은 값이다 */
function getGlowSeed(id: string): number {
  const sequence = Number.parseInt(id.replace(/\D/g, ""), 10);
  return Number.isFinite(sequence) ? sequence * 1.37 : 0;
}

function getGlow(id: string): FlyingLanternGlow {
  return {
    emissiveIntensity: LANTERN_GLOW_CONFIG.flyingEmissiveIntensity,
    settings: LANTERN_GLOW_CONFIG.glow,
    seed: getGlowSeed(id),
  };
}

/**
 * 게임의 발사 천등 목록 (store `flying`). 발사·제거처럼 **목록이 바뀔 때만** 다시 렌더된다.
 * - key = 천등 id(세션 안에서 고유). 새 천등을 받아도 기존 인스턴스는 그대로 유지되어 애니메이션이 이어진다.
 * - 크기는 손 천등과 같다 (발사 순간 갑자기 커지지 않음). 발광은 emissive만 쓰고 pointLight는 붙이지 않는다.
 * - 수명이 끝나면 각 인스턴스가 removeFlyingLantern(id)을 한 번 부르고, 목록에서 빠지며 언마운트 → 텍스처 해제.
 */
export function FlyingLanterns() {
  const flying = useGameStore((state) => state.flying);
  const removeFlyingLantern = useGameStore((state) => state.removeFlyingLantern);

  return (
    <>
      {flying.map((lantern) => (
        <FlyingLantern
          key={lantern.id}
          id={lantern.id}
          colorHex={getLanternColorHex(lantern.colorId)}
          strokes={lantern.strokes}
          spawn={lantern.spawn}
          yaw={lantern.yaw}
          drift={lantern.drift}
          scale={HELD_LANTERN_CONFIG.scale}
          profile={GAME_FLIGHT_PROFILE}
          glow={getGlow(lantern.id)}
          onExpire={removeFlyingLantern}
        />
      ))}
    </>
  );
}
