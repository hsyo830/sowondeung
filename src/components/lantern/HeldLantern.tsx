"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Group, Object3D, PointLight } from "three";

import { LanternModel } from "@/components/lantern/LanternModel";
import { getLanternColorHex } from "@/constants/lanternColors";
import { getLanternGlow } from "@/lib/game/lanternGlow";
import { HELD_LANTERN_CONFIG, LANTERN_GLOW_CONFIG } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";

// useFrame에서 매 프레임 새로 만들지 않도록 모듈에 하나만 둔다 (CODING_CONVENTIONS §7)
const handPosition = new Vector3();
const HAND_OFFSET = new Vector3(...HELD_LANTERN_CONFIG.handOffset);
/** 손 천등 흔들림 위상. 발사 천등(인스턴스마다 다른 seed)과 같은 박자로 흔들리지 않게 고정값을 준다 */
const HELD_GLOW_SEED = 0.7;

interface HeldLanternProps {
  /** CharacterModel이 찾아서 넣어 주는 손 본. 없으면 null */
  handBoneRef: RefObject<Object3D | null>;
  /**
   * 손을 따라다니는 천등 중심 그룹. 발사할 때 이 그룹의 **실제 월드 위치·방향**에서 출발하고(LaunchHoldButton),
   * 손 천등 pointLight도 이 위치를 따라간다(HeldLanternLight).
   */
  anchorRef: RefObject<Group | null>;
  /** 점화 중 종이 emissive 세기. HeldLanternLight가 매 프레임 계산해 넣는다 */
  glowRef: RefObject<number>;
}

/**
 * 손에 든 천등 (SPEC §4 천등 부착). store의 held를 그대로 그린다 (손글씨 데이터의 원본은 store 하나, 텍스처는 이 인스턴스 소유).
 * - 손을 따라가는 그룹(anchor)은 항상 마운트한다. 천등 모델만 NONE이면 마운트하지 않는다.
 *   BLANK가 되는 순간 마운트되어 텍스처 1개를 만들고, 발사(→ NONE)하면 언마운트되며 자기 텍스처를 해제한다.
 * - 색·획이 바뀌면 같은 인스턴스·같은 텍스처에 다시 그린다 (새 메시·텍스처를 만들지 않음).
 * - anchor는 캐릭터 모델의 **스케일 없는 바깥 그룹**(위치·Y 회전만 있음)의 자식이다. 그래서 회전은 캐릭터 Y축만 따른다.
 *   손 본의 자식으로 붙이지 않는다 (루트 0.01 스케일과 손목 회전을 물려받지 않게). 매 프레임 위치만 복사한다.
 */
export function HeldLantern({ handBoneRef, anchorRef, glowRef }: HeldLanternProps) {
  const status = useGameStore((state) => state.held.status);
  const colorId = useGameStore((state) => state.held.colorId);
  const strokes = useGameStore((state) => state.held.strokes);

  useFrame(() => {
    const group = anchorRef.current;
    const parent = group?.parent;
    if (!group || !parent) return;

    const hand = handBoneRef.current;
    if (!hand) {
      // 손 본을 찾지 못하면 캐릭터 루트 기준 고정 위치 (CharacterModel이 경고를 남긴다)
      group.position.set(...HELD_LANTERN_CONFIG.fallbackPosition);
      return;
    }
    // 손 본의 조상에 바깥 그룹이 있으므로, 이 갱신으로 손과 바깥 그룹의 월드 행렬이 같은 시점 값이 된다.
    // CharacterModel의 useFrame보다 먼저 실행돼도 '지난 프레임 자세 기준의 상대 위치'라 어긋나지 않는다.
    hand.updateWorldMatrix(true, false);
    handPosition.setFromMatrixPosition(hand.matrixWorld);
    parent.worldToLocal(handPosition);
    group.position.copy(handPosition).add(HAND_OFFSET);
  });

  return (
    <group ref={anchorRef} position={HELD_LANTERN_CONFIG.fallbackPosition}>
      {status !== "NONE" && (
        <group scale={HELD_LANTERN_CONFIG.scale}>
          {/* 1단계 LanternModel 그대로. 텍스처는 이 인스턴스가 만들고 언마운트 때 해제한다 (SPEC §5 소유권) */}
          <LanternModel
            colorHex={getLanternColorHex(colorId)}
            strokes={strokes}
            lit={status === "LIT"}
            glowRef={glowRef}
          />
        </group>
      )}
    </group>
  );
}

interface HeldLanternLightProps {
  anchorRef: RefObject<Group | null>;
  glowRef: RefObject<number>;
}

/**
 * 점화한 손 천등의 따뜻한 빛 + 발광 세기 계산 (SPEC §5 [결정] 소지 천등 pointLight).
 * - pointLight는 **처음부터 마운트**하고 intensity만 0 ↔ N으로 바꾼다. 라이트 수가 바뀌면 셰이더를 다시 컴파일해 화면이 멈춘다.
 * - 캐릭터 그룹 밖(씬 루트)에 둔다. 작성 모드에서 캐릭터 그룹이 숨겨지면 그 안의 라이트도 렌더 목록에서 빠져
 *   라이트 수가 바뀌기 때문이다. 대신 매 프레임 anchor의 월드 위치를 따라간다.
 * - 점화 순간(LIT이 된 첫 프레임)의 시각을 ref에 기억해 점화 연출(0 → 밝게 → 안정)을 계산한다. store는 바꾸지 않는다.
 * - 발사 천등에는 라이트를 붙이지 않는다 (SPEC §5 [결정], 개수 제한 없이 늘지 않게). 이 라이트는 씬에 하나뿐이다.
 */
export function HeldLanternLight({ anchorRef, glowRef }: HeldLanternLightProps) {
  const lightRef = useRef<PointLight>(null);
  const litAtSecRef = useRef<number | null>(null);

  useFrame(({ clock }) => {
    const light = lightRef.current;
    if (!light) return;
    const isLit = useGameStore.getState().held.status === "LIT";
    const time = clock.elapsedTime;

    if (!isLit) {
      litAtSecRef.current = null;
      glowRef.current = 0;
      light.intensity = 0;
      return;
    }
    if (litAtSecRef.current === null) litAtSecRef.current = time;
    const glow = getLanternGlow(
      time,
      time - litAtSecRef.current,
      HELD_GLOW_SEED,
      LANTERN_GLOW_CONFIG.glow,
    );
    glowRef.current = LANTERN_GLOW_CONFIG.emissiveIntensity * glow;
    light.intensity = HELD_LANTERN_CONFIG.light.intensity * glow;

    const anchor = anchorRef.current;
    if (!anchor) return;
    anchor.updateWorldMatrix(true, false);
    light.position.setFromMatrixPosition(anchor.matrixWorld);
  });

  const { light } = HELD_LANTERN_CONFIG;
  return (
    <pointLight
      ref={lightRef}
      color={light.color}
      intensity={0}
      distance={light.distance}
      decay={light.decay}
    />
  );
}
