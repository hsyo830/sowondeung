import { FACE_CANVAS_HEIGHT, FACE_CANVAS_WIDTH } from "@/constants/writing";
import type { Point } from "@/types/game";

/** DOMRect 중 좌표 변환에 필요한 값만 받는다 (node 테스트에서 DOMRect 없이 호출하기 위해) */
export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 화면 좌표(clientX/Y) → 512 × 768 논리 좌표.
 * Canvas는 CSS로 크기가 바뀌므로 표시 크기 대비 비율로 환산한다.
 * pointer capture 중에는 Canvas 밖 좌표도 들어오므로 경계로 clamp해서 선이 밖으로 튀지 않게 한다.
 */
export function toLogicalPoint(clientX: number, clientY: number, rect: CanvasRect): Point {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const x = ((clientX - rect.left) * FACE_CANVAS_WIDTH) / rect.width;
  const y = ((clientY - rect.top) * FACE_CANVAS_HEIGHT) / rect.height;
  return {
    x: clamp(x, 0, FACE_CANVAS_WIDTH),
    y: clamp(y, 0, FACE_CANVAS_HEIGHT),
  };
}
