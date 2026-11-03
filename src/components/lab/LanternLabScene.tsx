"use client";

import { useRef } from "react";

import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";

import { MemoryProbe } from "@/components/game/MemoryProbe";
import { FlyingLantern } from "@/components/lantern/FlyingLantern";
import { LanternModel } from "@/components/lantern/LanternModel";
import type { Stroke } from "@/types/game";

const AUTO_ROTATE_SPEED_RAD_PER_SEC = 0.6;
const PREVIEW_POSITION = [-0.9, 0, 0] as const;
const FLIGHT_SPAWN = [1.1, -1.2, 0] as const;

/** 랩에서 띄운 발사 천등 하나. 발사 시점의 색·획을 복사가 아닌 참조로 들고 있다 */
export interface LabFlyingLantern {
  id: string;
  colorHex: string;
  strokes: readonly Stroke[];
}

interface PreviewLanternProps {
  colorHex: string;
  strokes: readonly Stroke[];
  lit: boolean;
  isAutoRotate: boolean;
  manualAngleDeg: number;
}

/** 미리보기 천등. 회전은 매 프레임 바뀌므로 ref에 직접 쓴다 (setState 없음). */
function PreviewLantern({
  colorHex,
  strokes,
  lit,
  isAutoRotate,
  manualAngleDeg,
}: PreviewLanternProps) {
  const groupRef = useRef<Group>(null);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    if (isAutoRotate) {
      group.rotation.y += delta * AUTO_ROTATE_SPEED_RAD_PER_SEC;
    } else {
      group.rotation.y = (manualAngleDeg * Math.PI) / 180;
    }
  });

  return (
    <group ref={groupRef} position={PREVIEW_POSITION}>
      <LanternModel colorHex={colorHex} strokes={strokes} lit={lit} />
    </group>
  );
}

interface LanternLabSceneProps {
  colorHex: string;
  strokes: readonly Stroke[];
  lit: boolean;
  isAutoRotate: boolean;
  manualAngleDeg: number;
  isToneMapped: boolean;
  flyingLanterns: readonly LabFlyingLantern[];
  onFlyingExpire: (id: string) => void;
}

export function LanternLabScene({
  colorHex,
  strokes,
  lit,
  isAutoRotate,
  manualAngleDeg,
  isToneMapped,
  flyingLanterns,
  onFlyingExpire,
}: LanternLabSceneProps) {
  const memoryTextRef = useRef<HTMLSpanElement>(null);

  return (
    <div className="relative h-full w-full">
      {/* flat = NoToneMapping. 2D/3D 색 비교를 위해 랩에서만 토글한다 (SPEC §5 색 일치 검증) */}
      <Canvas camera={{ position: [0, 0.6, 6], fov: 45 }} flat={!isToneMapped}>
        <color attach="background" args={["#141a2e"]} />
        {/* three r155+ 물리 기반 조명: intensity π ≈ 알베도 그대로. 정면이 원래 색에 가깝게 보이도록 배분 */}
        <ambientLight intensity={Math.PI * 0.6} />
        <directionalLight position={[1, 2, 5]} intensity={Math.PI * 0.5} />
        <PreviewLantern
          colorHex={colorHex}
          strokes={strokes}
          lit={lit}
          isAutoRotate={isAutoRotate}
          manualAngleDeg={manualAngleDeg}
        />
        {flyingLanterns.map((lantern) => (
          <FlyingLantern
            key={lantern.id}
            id={lantern.id}
            colorHex={lantern.colorHex}
            strokes={lantern.strokes}
            spawn={FLIGHT_SPAWN}
            onExpire={onFlyingExpire}
          />
        ))}
        <MemoryProbe targetRef={memoryTextRef} />
      </Canvas>
      <span
        ref={memoryTextRef}
        className="absolute top-2 left-2 rounded bg-black/60 px-2 py-1 font-mono text-xs text-white"
      />
    </div>
  );
}
