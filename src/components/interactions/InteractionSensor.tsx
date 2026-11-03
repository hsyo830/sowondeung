"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

import { clampToBounds } from "@/lib/game/interaction";
import { CAMPFIRE_CONFIG, INTERACTION_CONFIG, LANDMARKS } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";
import type { InteractionId, PlayerState } from "@/types/game";

import { resolveCurrentInteraction } from "./interactionRuntime";

const TABLE_PROMPT_Y = LANDMARKS.table.topY + INTERACTION_CONFIG.promptHeightAboveTop;
/** 모닥불 버튼은 불꽃 위에 뜬다. 불꽃·조명 위치와 같은 값(CAMPFIRE_CONFIG)에서 계산한다 */
const CAMPFIRE_PROMPT = {
  x: CAMPFIRE_CONFIG.flameShape.centerX,
  y: CAMPFIRE_CONFIG.flameShape.topY + INTERACTION_CONFIG.promptHeightAboveTop,
  z: CAMPFIRE_CONFIG.flameShape.centerZ,
} as const;

// useFrame에서 매 프레임 새로 만들지 않도록 모듈에 하나만 둔다 (CODING_CONVENTIONS §7)
const projected = new Vector3();

interface InteractionSensorProps {
  playerRef: RefObject<PlayerState>;
  /** 상호작용 버튼을 담는 HTML 요소. 화면 위치를 여기에 직접 쓴다 */
  promptAnchorRef: RefObject<HTMLDivElement | null>;
}

/** 버튼이 가리킬 3D 위치를 projected에 쓴다. 탁자는 상판에서 플레이어와 가장 가까운 점, 모닥불은 불꽃 위 */
function setPromptPoint(id: InteractionId, player: PlayerState): void {
  if (id === "campfire") {
    projected.set(CAMPFIRE_PROMPT.x, CAMPFIRE_PROMPT.y, CAMPFIRE_PROMPT.z);
    return;
  }
  const point = clampToBounds(player.x, player.z, LANDMARKS.table.topBounds);
  projected.set(point.x, TABLE_PROMPT_Y, point.z);
}

/**
 * Canvas 안에서 매 프레임:
 * 1. 근접 상호작용 대상을 판정하고, **바뀔 때만** store에 쓴다 (HUD가 프레임마다 리렌더되지 않게).
 * 2. 버튼이 뜰 3D 위치(탁자 상판 위 / 불꽃 위)를 화면 좌표로 바꿔 DOM에 직접 쓴다.
 *    React state를 거치지 않으므로 카메라가 움직여도 리렌더가 없다.
 * 아무것도 그리지 않는다.
 */
export function InteractionSensor({ playerRef, promptAnchorRef }: InteractionSensorProps) {
  const lastTransformRef = useRef("");

  useFrame(({ camera, size }) => {
    const player = playerRef.current;
    const nextId = resolveCurrentInteraction(player)?.id ?? null;
    const store = useGameStore.getState();
    if (nextId !== store.nearbyInteractionId) store.setNearbyInteraction(nextId);

    const anchor = promptAnchorRef.current;
    if (!anchor || !nextId) return;

    setPromptPoint(nextId, player);
    projected.project(camera);
    // project 결과 z > 1이면 카메라 뒤쪽이다. 3인칭 카메라에서는 생기지 않지만 화면 밖에 엉뚱하게 뜨지 않게 숨긴다
    const isVisible = projected.z <= 1;
    const x = Math.round(((projected.x + 1) / 2) * size.width);
    const y = Math.round(((1 - projected.y) / 2) * size.height);
    const transform = `translate3d(${x}px, ${y}px, 0)`;
    if (transform !== lastTransformRef.current) {
      lastTransformRef.current = transform;
      anchor.style.transform = transform;
    }
    anchor.style.visibility = isVisible ? "visible" : "hidden";
  });

  return null;
}
