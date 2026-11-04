"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";

import { warmUpTransmission } from "@/components/game/transmissionWarmup";
import { getGameReadiness } from "@/lib/game/gameReadiness";
import type { Heightfield } from "@/lib/game/terrain";
import { useGameLoadingStore } from "@/stores/gameLoadingStore";

interface GameReadyProbeProps {
  terrainRef: RefObject<Heightfield | null>;
}

/**
 * 게임 준비 완료를 알린다 (아무것도 그리지 않는다). 숲 배경·캐릭터와 **같은 Suspense 안 마지막**에 둔다.
 * 마운트됐다 = 두 GLB 로딩 완료 + 같은 커밋의 초기화(바닥 격자·AnimationMixer·손 본) 실행 완료 (gameReadiness 주석).
 * 첫 프레임 콜백에서 투과 렌더링(나뭇가지 등불 Glass)을 미리 준비하고(transmissionWarmup),
 * 그 뒤 한 번 렌더된 것을 확인하고 바닥 격자를 보고 ready/failed를 store에 **한 번만** 알린다.
 * CODING_CONVENTIONS §7 1회성 수명 이벤트: 순수 함수 판정 + 호출 전에 ref 가드를 켠다.
 */
export function GameReadyProbe({ terrainRef }: GameReadyProbeProps) {
  const renderedFramesRef = useRef(0);
  const hasSettledRef = useRef(false);
  const hasAttemptedWarmupRef = useRef(false);

  useFrame(({ gl, scene, camera }) => {
    if (hasSettledRef.current) return;
    // 투과 렌더링 사전 준비: 첫 프레임 콜백에서 한 번만 (이 Probe는 마운트 순서상 CameraRig 뒤라 카메라가 이미 이번 프레임 위치다).
    // 로딩 화면이 이미 걷혔으면(다시 마운트된 경우) 하지 않는다. 실패해도 로딩은 계속 진행한다 (gameReadiness 주석)
    if (!hasAttemptedWarmupRef.current) {
      hasAttemptedWarmupRef.current = true;
      if (useGameLoadingStore.getState().status === "loading") {
        try {
          if (!warmUpTransmission(gl, scene, camera)) {
            console.warn("[GameReadyProbe] 투과 렌더 타깃을 확인하지 못했다 (첫 발사 때 준비된다)");
          }
        } catch (error) {
          console.warn("[GameReadyProbe] 투과 렌더링 사전 준비 실패", error);
        }
      }
    }
    const readiness = getGameReadiness({
      renderedFrames: renderedFramesRef.current,
      hasTerrain: terrainRef.current !== null,
      hasAttemptedWarmup: hasAttemptedWarmupRef.current,
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
