"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";

import { getGameReadiness } from "@/lib/game/gameReadiness";
import type { Heightfield } from "@/lib/game/terrain";
import { useGameLoadingStore } from "@/stores/gameLoadingStore";

interface GameReadyProbeProps {
  terrainRef: RefObject<Heightfield | null>;
}

/**
 * 게임 준비 완료를 알린다 (아무것도 그리지 않는다). 숲 배경·캐릭터와 **같은 Suspense 안 마지막**에 둔다.
 * 마운트됐다 = 두 GLB 로딩 완료 + 같은 커밋의 초기화(바닥 격자·AnimationMixer·손 본) 실행 완료 (gameReadiness 주석).
 * 그 뒤 한 번 렌더된 것을 확인하고 바닥 격자를 보고 ready/failed를 store에 **한 번만** 알린다.
 * CODING_CONVENTIONS §7 1회성 수명 이벤트: 순수 함수 판정 + 호출 전에 ref 가드를 켠다.
 */
export function GameReadyProbe({ terrainRef }: GameReadyProbeProps) {
  const renderedFramesRef = useRef(0);
  const hasSettledRef = useRef(false);

  useFrame(() => {
    if (hasSettledRef.current) return;
    const readiness = getGameReadiness({
      renderedFrames: renderedFramesRef.current,
      hasTerrain: terrainRef.current !== null,
    });
    renderedFramesRef.current += 1;
    if (readiness === "pending") return;

    hasSettledRef.current = true;
    const loading = useGameLoadingStore.getState();
    if (readiness === "ready") loading.markReady();
    else loading.markFailed();
  });

  return null;
}
