"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Group, Object3D } from "three";

import { LanternModel } from "@/components/lantern/LanternModel";
import { getLanternColorHex } from "@/constants/lanternColors";
import { HELD_LANTERN_CONFIG } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";
import type { Stroke } from "@/types/game";

// useFrame에서 매 프레임 새로 만들지 않도록 모듈에 하나만 둔다 (CODING_CONVENTIONS §7)
const handPosition = new Vector3();
const HAND_OFFSET = new Vector3(...HELD_LANTERN_CONFIG.handOffset);

interface HandAttachedLanternProps {
  handBoneRef: RefObject<Object3D | null>;
  colorHex: string;
  strokes: readonly Stroke[];
  lit: boolean;
}

/**
 * 손 본을 따라가는 천등 (SPEC §4 천등 부착).
 * - 이 그룹은 캐릭터 모델의 **스케일 없는 바깥 그룹**(위치·Y 회전만 있음)의 자식이다. 그래서 회전은 캐릭터 Y축만 따른다.
 * - 손 본의 자식으로 붙이지 않는다. 캐릭터 루트의 0.01 스케일과 손목 회전을 물려받으면 천등이 작아지고 과하게 흔들린다.
 * - 매 프레임 손 본의 월드 위치를 바깥 그룹의 로컬 좌표로 바꿔 위치만 복사한다.
 */
function HandAttachedLantern({ handBoneRef, colorHex, strokes, lit }: HandAttachedLanternProps) {
  const groupRef = useRef<Group>(null);

  useFrame(() => {
    const group = groupRef.current;
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
    <group
      ref={groupRef}
      position={HELD_LANTERN_CONFIG.fallbackPosition}
      scale={HELD_LANTERN_CONFIG.scale}
    >
      {/* 1단계 LanternModel 그대로. 텍스처는 이 인스턴스가 만들고 언마운트 때 해제한다 (SPEC §5 소유권) */}
      <LanternModel colorHex={colorHex} strokes={strokes} lit={lit} />
    </group>
  );
}

interface HeldLanternProps {
  /** CharacterModel이 찾아서 넣어 주는 손 본. 없으면 null */
  handBoneRef: RefObject<Object3D | null>;
}

/**
 * 손에 든 천등. store의 held를 그대로 그린다 (손글씨 데이터의 원본은 store 하나, 텍스처는 이 인스턴스 소유).
 * - NONE이면 마운트하지 않는다. BLANK가 되는 순간 마운트되어 텍스처 1개를 만든다.
 * - 색·획이 바뀌면 같은 인스턴스·같은 텍스처에 다시 그린다 (새 메시·텍스처를 만들지 않음).
 */
export function HeldLantern({ handBoneRef }: HeldLanternProps) {
  const status = useGameStore((state) => state.held.status);
  const colorId = useGameStore((state) => state.held.colorId);
  const strokes = useGameStore((state) => state.held.strokes);

  if (status === "NONE") return null;
  return (
    <HandAttachedLantern
      handBoneRef={handBoneRef}
      colorHex={getLanternColorHex(colorId)}
      strokes={strokes}
      lit={status === "LIT"}
    />
  );
}
