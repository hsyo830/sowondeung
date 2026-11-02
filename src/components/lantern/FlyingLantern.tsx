"use client";

import { useRef } from "react";

import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

import { LanternModel } from "@/components/lantern/LanternModel";
import {
  clampDelta,
  getRiseOffset,
  getSpinAngle,
  getSwayOffset,
  shouldRemoveFlyingLantern,
} from "@/lib/game/flight";
import type { Stroke } from "@/types/game";

interface FlyingLanternProps {
  id: number;
  colorHex: string;
  /** 발사 시점의 획 배열 (참조 공유). 텍스처는 이 인스턴스가 새로 만든다 (SPEC §5) */
  strokes: readonly Stroke[];
  spawn: readonly [number, number, number];
  onExpire: (id: number) => void;
}

/**
 * 발사된 천등. 위치·회전은 매 프레임 ref(Object3D)에 직접 쓰고 React 상태를 바꾸지 않는다.
 * 제거 조건을 넘으면 onExpire를 **한 번만** 호출한다. 이것은 프레임마다 바뀌는 값이 아니라
 * 수명이 끝났다는 1회성 이벤트다 (4단계에서는 store의 removeFlyingLantern이 받는다).
 * CODING_CONVENTIONS §7 예외: 가드를 호출 전에 켜서 정확히 한 번만 호출하고, 이후 프레임은 즉시 반환한다.
 */
export function FlyingLantern({ id, colorHex, strokes, spawn, onExpire }: FlyingLanternProps) {
  const groupRef = useRef<Group>(null);
  const elapsedSecRef = useRef(0);
  const hasExpiredRef = useRef(false);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group || hasExpiredRef.current) return;

    const elapsedSec = elapsedSecRef.current + clampDelta(delta);
    elapsedSecRef.current = elapsedSec;

    const [x, y, z] = spawn;
    group.position.set(x + getSwayOffset(elapsedSec), y + getRiseOffset(elapsedSec), z);
    group.rotation.y = getSpinAngle(elapsedSec);

    if (shouldRemoveFlyingLantern(group.position.y, elapsedSec)) {
      hasExpiredRef.current = true;
      onExpire(id);
    }
  });

  return (
    // 첫 프레임 전에도 출발 위치에 보이도록 초기 position을 준다
    <group ref={groupRef} position={spawn}>
      <LanternModel colorHex={colorHex} strokes={strokes} lit />
    </group>
  );
}
