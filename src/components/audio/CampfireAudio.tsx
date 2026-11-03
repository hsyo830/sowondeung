"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";

import { getAudioEngine } from "@/lib/audio/audioEngine";
import { getCampfireProximity } from "@/lib/audio/soundRules";
import { CAMPFIRE_AUDIO_CONFIG, LANDMARKS } from "@/lib/game/worldConfig";
import type { PlayerState } from "@/types/game";

/** 근접도가 이만큼 이상 바뀔 때만 엔진에 알린다 (가만히 서 있으면 아무 일도 하지 않는다) */
const PROXIMITY_EPSILON = 0.005;

interface CampfireAudioProps {
  playerRef: RefObject<PlayerState>;
}

/**
 * 모닥불 소리 크기 = 캐릭터 실제 위치와 모닥불 사이 수평 거리. 매 프레임 값이라 React 상태를 쓰지 않는다.
 * 음량을 부드럽게 바꾸는 일(보간)은 엔진이 AudioParam으로 한다. 아무것도 그리지 않는다.
 */
export function CampfireAudio({ playerRef }: CampfireAudioProps) {
  const lastProximityRef = useRef<number | null>(null);

  useFrame(() => {
    const player = playerRef.current;
    const distance = Math.hypot(player.x - LANDMARKS.campfire.x, player.z - LANDMARKS.campfire.z);
    const proximity = getCampfireProximity(
      distance,
      CAMPFIRE_AUDIO_CONFIG.fullVolumeDistance,
      CAMPFIRE_AUDIO_CONFIG.silentDistance,
    );
    const last = lastProximityRef.current;
    if (last !== null && Math.abs(proximity - last) < PROXIMITY_EPSILON) return;
    lastProximityRef.current = proximity;
    getAudioEngine().setCampfireProximity(proximity);
  });

  return null;
}
