"use client";

import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

import { CanvasTexture, SRGBColorSpace } from "three";
import type { MeshStandardMaterial } from "three";

import { FACE_CANVAS_HEIGHT, FACE_CANVAS_WIDTH } from "@/constants/writing";
import { drawLanternFace } from "@/lib/lantern/drawLanternFace";
import type { Stroke } from "@/types/game";

/**
 * 천등 앞면 손글씨 텍스처를 만들고, 호출한 컴포넌트 인스턴스가 소유하게 한다 (SPEC §5 소유권).
 *
 * - 생성과 해제를 **같은 useLayoutEffect**에서 짝짓는다. StrictMode의 마운트 → 정리 → 재마운트에서
 *   첫 텍스처는 한 번도 렌더링되지 않은 채 해제되고, 재마운트 때 새로 만든다. 해제된 텍스처를 다시 쓰는 경로가 없다.
 * - 렌더 중(useMemo·useState 초기화)에는 만들지 않는다. 정리 함수에서 해제된 뒤에도 같은 값이 남아 재사용되기 때문이다.
 * - state에 넣지 않고 ref + 명령형 할당을 쓴다. effect 안에서 setState하지 않기 위해서다.
 * - `map`을 JSX prop으로 넘기지 않는다. R3F가 리렌더할 때 명령형으로 연결한 값을 덮어쓴다.
 * - 텍스처는 다른 컴포넌트와 공유하지 않는다. 공유하는 것은 획 데이터뿐이다.
 */
export function useLanternTexture(
  materialRef: RefObject<MeshStandardMaterial | null>,
  colorHex: string,
  strokes: readonly Stroke[],
): void {
  const textureRef = useRef<CanvasTexture | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // 마운트 1회: 오프스크린 Canvas + 텍스처 생성 → 재질에 연결. 정리 함수에서 연결 해제 + dispose.
  useLayoutEffect(() => {
    const material = materialRef.current;
    if (!material) return;

    const canvas = document.createElement("canvas");
    canvas.width = FACE_CANVAS_WIDTH;
    canvas.height = FACE_CANVAS_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return;

    const texture = new CanvasTexture(canvas);
    // Canvas에 칠한 HEX는 sRGB 값이다. 이렇게 지정해야 3D 종이색이 2D 배경색과 같게 나온다.
    texture.colorSpace = SRGBColorSpace;
    // flipY는 기본값(true)을 유지한다. Canvas는 위→아래, UV는 아래→위라 이 값이 있어야 상하가 맞는다.

    textureRef.current = texture;
    contextRef.current = context;
    material.map = texture;
    // 점화 시 종이가 글씨까지 포함해 같은 그림으로 빛나도록 emissive에도 같은 텍스처를 쓴다
    // (단색 emissive를 더하면 검정 글씨가 종이색으로 물든다).
    material.emissiveMap = texture;
    // map 유무는 셰이더 define(USE_MAP)을 바꾸므로 재질 재컴파일을 요청한다.
    material.needsUpdate = true;

    return () => {
      // 이 effect가 만든 것만 해제한다. R3F는 map으로 연결한 텍스처를 해제해 주지 않는다.
      if (material.map === texture) material.map = null;
      if (material.emissiveMap === texture) material.emissiveMap = null;
      material.needsUpdate = true;
      texture.dispose();
      textureRef.current = null;
      contextRef.current = null;
    };
  }, [materialRef]);

  // 색·획이 바뀌면 같은 Canvas에 다시 그리고 업로드만 요청한다. 텍스처를 새로 만들지 않는다.
  // 위 effect보다 뒤에 선언해야 마운트(와 StrictMode 재마운트) 때 새 텍스처에 그려진다.
  useLayoutEffect(() => {
    const texture = textureRef.current;
    const context = contextRef.current;
    if (!texture || !context) return;
    drawLanternFace(context, colorHex, strokes);
    texture.needsUpdate = true;
  }, [colorHex, strokes]);
}
