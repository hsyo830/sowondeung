"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

import { getLanternColorHex } from "@/constants/lanternColors";
import { FACE_CANVAS_HEIGHT, FACE_CANVAS_WIDTH } from "@/constants/writing";
import { smoothstep01 } from "@/lib/game/camera";
import { clampDelta } from "@/lib/game/flight";
import { WRITING_VIEW } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";

const { paper } = WRITING_VIEW;
/** 손글씨 Canvas와 같은 2:3 */
const CANVAS_ASPECT = FACE_CANVAS_WIDTH / FACE_CANVAS_HEIGHT;
/**
 * 작성 Canvas가 나타나기 시작하는 시점 (카메라 전환 진행률). 그 전에는 3D 종이만 보인다.
 * 카메라가 비스듬할 때 2D Canvas를 겹치면 탁자 위에 떠 있는 것처럼 보이기 때문이다 (헤드리스 확인).
 */
const OVERLAY_FADE_START = 0.6;

/**
 * 종이 네 모서리 (월드 x, z). 캔버스 위쪽이 카메라에서 먼 쪽(-x), 캔버스 오른쪽이 -z다.
 * 작성 카메라가 +x 쪽 위에서 -x를 내려다보므로 화면에서 똑바로 선 종이로 보인다.
 */
const PAPER_CORNERS = [
  [paper.x - paper.height / 2, paper.z - paper.width / 2],
  [paper.x - paper.height / 2, paper.z + paper.width / 2],
  [paper.x + paper.height / 2, paper.z - paper.width / 2],
  [paper.x + paper.height / 2, paper.z + paper.width / 2],
] as const;

// useFrame에서 매 프레임 새로 만들지 않도록 모듈에 하나만 둔다 (CODING_CONVENTIONS §7)
const projected = new Vector3();

interface PaperSheetProps {
  colorHex: string;
  overlayRef: RefObject<HTMLDivElement | null>;
}

function PaperSheet({ colorHex, overlayRef }: PaperSheetProps) {
  const lastStyleRef = useRef("");
  const elapsedSecRef = useRef(0);

  useFrame(({ camera, size }, delta) => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    // CameraRig와 같은 전환 시간을 기준으로, 카메라가 거의 내려왔을 때 Canvas를 서서히 보인다
    elapsedSecRef.current += clampDelta(delta);
    const progress = elapsedSecRef.current / WRITING_VIEW.transitionSec;
    const opacity = smoothstep01((progress - OVERLAY_FADE_START) / (1 - OVERLAY_FADE_START));

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, z] of PAPER_CORNERS) {
      projected.set(x, paper.y, z).project(camera);
      const screenX = ((projected.x + 1) / 2) * size.width;
      const screenY = ((1 - projected.y) / 2) * size.height;
      minX = Math.min(minX, screenX);
      maxX = Math.max(maxX, screenX);
      minY = Math.min(minY, screenY);
      maxY = Math.max(maxY, screenY);
    }
    // 비스듬히 내려다보므로 화면 속 종이는 가까운 변이 넓은 사다리꼴이고 세로가 조금 눌려 보인다.
    // 2:3 Canvas를 가장 넓은 변 너비에 맞춰 종이 가운데에 두면 3D 종이 전체를 덮어서, 탁자 위에 놓인 반듯한 종이로 보인다.
    const width = Math.round(maxX - minX);
    const left = Math.round(minX);
    const top = Math.round((minY + maxY) / 2 - width / CANVAS_ASPECT / 2);
    const style = `${left},${top},${width},${opacity.toFixed(2)}`;
    if (style === lastStyleRef.current) return;
    lastStyleRef.current = style;
    overlay.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    overlay.style.width = `${width}px`;
    overlay.style.opacity = opacity.toFixed(2);
    overlay.style.visibility = "visible";
  });

  return (
    // 테이블 위에 눕힌 종이: 바깥 그룹이 Y축 90°, 안쪽 평면이 X축 -90° → 평면 +y(캔버스 위) = 월드 -x
    <group position={[paper.x, paper.y, paper.z]} rotation-y={Math.PI / 2}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[paper.width, paper.height]} />
        {/* 2D 작성 Canvas 배경과 같은 색으로 보이도록 조명·톤 매핑 없이 칠한다 */}
        <meshBasicMaterial color={colorHex} toneMapped={false} />
      </mesh>
    </group>
  );
}

interface WritingPaperProps {
  /** 작성 Canvas를 담는 HTML 요소. 종이의 화면 위치·크기를 여기에 직접 쓴다 */
  overlayRef: RefObject<HTMLDivElement | null>;
}

/**
 * 작성 모드에서 테이블 위에 펼친 천등 종이 (SPEC §4 WRITING 4번).
 * 실제 필기는 HTML Canvas(WritingCanvas)에서만 받는다 (Raycasting 없음). 이 컴포넌트는 매 프레임 종이를 화면에 투영해
 * 그 자리에 작성 Canvas를 겹쳐 놓는다. 카메라가 내려오는 동안에도 Canvas가 종이를 따라가서 탁자 위에 쓰는 것처럼 보인다.
 * 작성 모드에서만 마운트한다. Geometry·Material은 JSX로 선언해 언마운트 때 R3F가 해제한다.
 */
export function WritingPaper({ overlayRef }: WritingPaperProps) {
  const isWriting = useGameStore((state) => state.mode === "WRITING");
  const colorId = useGameStore((state) => state.held.colorId);

  if (!isWriting) return null;
  return <PaperSheet colorHex={getLanternColorHex(colorId)} overlayRef={overlayRef} />;
}
