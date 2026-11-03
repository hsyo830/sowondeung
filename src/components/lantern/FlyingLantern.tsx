"use client";

import { useRef } from "react";

import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

import { LanternModel } from "@/components/lantern/LanternModel";
import {
  LAB_FLIGHT_PROFILE,
  clampDelta,
  getFlyingLanternPosition,
  getSpinAngle,
  shouldRemoveFlyingLantern,
} from "@/lib/game/flight";
import type { FlightProfile } from "@/lib/game/flight";
import { getLanternGlow } from "@/lib/game/lanternGlow";
import type { LanternGlowSettings } from "@/lib/game/lanternGlow";
import type { Stroke, Vec2, Vec3 } from "@/types/game";

const NO_DRIFT: Vec2 = [0, 0];

/** 발사 천등의 발광 흔들림 (없으면 1단계처럼 고정 세기) */
export interface FlyingLanternGlow {
  emissiveIntensity: number;
  settings: LanternGlowSettings;
  /** 인스턴스마다 다른 흔들림 위상 */
  seed: number;
}

interface FlyingLanternProps {
  id: string;
  colorHex: string;
  /** 발사 시점의 획 배열 (참조 공유). 텍스처는 이 인스턴스가 새로 만든다 (SPEC §5) */
  strokes: readonly Stroke[];
  spawn: Vec3;
  onExpire: (id: string) => void;
  /** 출발 Y축 회전 (rad). 손에 들고 있던 방향에서 이어서 돈다. 기본 0 */
  yaw?: number;
  /** 상승 초반 바깥으로 흘러갈 수평 이동량. 기본 없음 */
  drift?: Vec2;
  /** 모델 배율. 게임은 손 천등과 같은 값(갑자기 커지지 않게), 랩은 1 */
  scale?: number;
  /** 궤적 모양. 기본은 1단계 랩 값 */
  profile?: FlightProfile;
  glow?: FlyingLanternGlow;
}

/**
 * 발사된 천등. 위치·회전·발광 세기는 매 프레임 ref(Object3D·재질)에 직접 쓰고 React 상태를 바꾸지 않는다.
 * 제거 조건을 넘으면 onExpire를 **한 번만** 호출한다. 이것은 프레임마다 바뀌는 값이 아니라
 * 수명이 끝났다는 1회성 이벤트다 (게임에서는 store의 removeFlyingLantern이 받는다).
 * CODING_CONVENTIONS §7 예외: 가드를 호출 전에 켜서 정확히 한 번만 호출하고, 이후 프레임은 즉시 반환한다.
 * 언마운트되면 LanternModel이 자기 텍스처를 해제한다. 공유 Geometry는 해제되지 않는다 (SPEC §5).
 */
export function FlyingLantern({
  id,
  colorHex,
  strokes,
  spawn,
  onExpire,
  yaw = 0,
  drift = NO_DRIFT,
  scale = 1,
  profile = LAB_FLIGHT_PROFILE,
  glow,
}: FlyingLanternProps) {
  const groupRef = useRef<Group>(null);
  const elapsedSecRef = useRef(0);
  const hasExpiredRef = useRef(false);
  const glowRef = useRef(glow?.emissiveIntensity ?? 0);

  useFrame(({ clock }, delta) => {
    const group = groupRef.current;
    if (!group || hasExpiredRef.current) return;

    const elapsedSec = elapsedSecRef.current + clampDelta(delta);
    elapsedSecRef.current = elapsedSec;

    // CameraRig의 발사 연출도 같은 함수로 이 위치를 계산한다
    getFlyingLanternPosition(spawn, drift, elapsedSec, profile, group.position);
    group.rotation.y = yaw + getSpinAngle(elapsedSec, profile);

    if (glow) {
      // 이미 타고 있는 상태로 출발하므로 점화 연출 없이 흔들림만 (secSinceLit = null)
      glowRef.current =
        glow.emissiveIntensity * getLanternGlow(clock.elapsedTime, null, glow.seed, glow.settings);
    }

    if (shouldRemoveFlyingLantern(group.position.y, elapsedSec)) {
      hasExpiredRef.current = true;
      onExpire(id);
    }
  });

  return (
    // 첫 프레임 전에도 출발 위치·방향에 보이도록 초기 position·rotation을 준다
    <group ref={groupRef} position={spawn} rotation-y={yaw}>
      <group scale={scale}>
        <LanternModel
          colorHex={colorHex}
          strokes={strokes}
          lit
          glowRef={glow ? glowRef : undefined}
        />
      </group>
    </group>
  );
}
