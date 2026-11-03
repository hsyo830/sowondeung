"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";

import { resolveMove } from "@/lib/game/collision";
import type { MoveWorld } from "@/lib/game/collision";
import { clampDelta } from "@/lib/game/flight";
import { getMoveDirection, getYawFromDirection, isMovementKey } from "@/lib/game/movement";
import { getTerrainHeight } from "@/lib/game/terrain";
import type { Heightfield } from "@/lib/game/terrain";
import { COLLIDERS, PLAYER_CONFIG, WALK_BOUNDS } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";
import type { PlayerState } from "@/types/game";

interface PlayerControllerProps {
  playerRef: RefObject<PlayerState>;
  terrainRef: RefObject<Heightfield | null>;
}

/**
 * 입력 → 이동 → 충돌. 플레이어 위치를 바꾸는 **유일한** 주체다 (SPEC §4).
 * 모델을 모르고, 결과(위치·바라볼 각도·이동 여부)를 playerRef에만 쓴다. 아무것도 그리지 않는다.
 */
export function PlayerController({ playerRef, terrainRef }: PlayerControllerProps) {
  const pressedKeysRef = useRef(new Set<string>());
  const isGroundedRef = useRef(false);

  useEffect(() => {
    const pressedKeys = pressedKeysRef.current;

    function handleKeyDown(event: KeyboardEvent) {
      if (!isMovementKey(event.code)) return;
      // SPEC §4: EXPLORE가 아닌 모드(색상 선택·작성)에서는 이동키를 무시한다
      if (useGameStore.getState().mode !== "EXPLORE") return;
      // 방향키가 페이지를 스크롤하지 않게 한다
      event.preventDefault();
      pressedKeys.add(event.code);
    }
    function handleKeyUp(event: KeyboardEvent) {
      pressedKeys.delete(event.code);
    }
    // SPEC §4 [결정] 창이 포커스를 잃으면 keyup이 오지 않는다. 키가 눌린 채로 남지 않게 전부 비운다.
    function clearKeys() {
      pressedKeys.clear();
    }
    function handleVisibilityChange() {
      if (document.hidden) clearKeys();
    }

    // SPEC §4 [결정] 모드가 바뀌는 순간(잠금·해제 모두) 눌려 있던 키를 비운다.
    // 키를 누른 채 작성 모드에 들어갔다 나와도 그 키가 계속 눌린 것으로 남지 않는다.
    const unsubscribeMode = useGameStore.subscribe((state, previous) => {
      if (state.mode !== previous.mode) clearKeys();
    });

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearKeys);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      unsubscribeMode();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearKeys);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearKeys();
    };
  }, []);

  useFrame((_, delta) => {
    const player = playerRef.current;
    const terrain = terrainRef.current;
    // 바닥 격자가 준비되기 전에는 움직이지 않는다 (바닥 판정을 할 수 없으므로)
    if (!terrain) {
      isGroundedRef.current = false;
      player.isMoving = false;
      return;
    }
    if (!isGroundedRef.current) {
      player.y = getTerrainHeight(terrain, player.x, player.z) ?? player.y;
      isGroundedRef.current = true;
    }

    // 이동 잠금: 색상 선택·작성 중에는 움직이지 않는다 (키 입력도 위에서 무시한다)
    if (useGameStore.getState().mode !== "EXPLORE") {
      player.isMoving = false;
      return;
    }

    const direction = getMoveDirection(pressedKeysRef.current);
    if (direction.x === 0 && direction.z === 0) {
      player.isMoving = false;
      return;
    }

    // 큰 delta(탭 복귀)로 한 번에 장애물을 건너뛰지 않게 상한을 둔다 (SPEC §3)
    const distance = PLAYER_CONFIG.speed * clampDelta(delta);
    const world: MoveWorld = {
      terrain,
      bounds: WALK_BOUNDS,
      colliders: COLLIDERS,
      radius: PLAYER_CONFIG.radius,
      maxStepHeight: PLAYER_CONFIG.maxStepHeight,
      maxSlope: PLAYER_CONFIG.maxSlope,
    };
    const next = resolveMove(player, direction.x * distance, direction.z * distance, world);

    // 막혀서 제자리여도 키를 누른 방향은 바라본다. 걷기 애니메이션은 실제로 움직였을 때만 재생한다.
    player.targetYaw = getYawFromDirection(direction.x, direction.z);
    player.isMoving = next.x !== player.x || next.z !== player.z;
    player.x = next.x;
    player.y = next.y;
    player.z = next.z;
  });

  return null;
}
