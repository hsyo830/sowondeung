import {
  BRUSH_COLOR,
  BRUSH_WIDTH_PX,
  FACE_CANVAS_HEIGHT,
  FACE_CANVAS_WIDTH,
} from "@/constants/writing";
import type { Stroke } from "@/types/game";

/**
 * 천등 앞면 그림을 처음부터 다시 그린다 (SPEC §5 결정적 그리기 유틸).
 * 작성 Canvas 화면과 3D 텍스처가 모두 이 함수를 쓰므로 2D와 3D 결과가 항상 같다.
 * 전달받은 ctx만 변경하고 외부 상태는 읽지 않는다. ctx는 512 × 768 Canvas의 것이어야 한다.
 */
export function drawLanternFace(
  ctx: CanvasRenderingContext2D,
  colorHex: string,
  strokes: readonly Stroke[],
): void {
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, FACE_CANVAS_WIDTH, FACE_CANVAS_HEIGHT);

  ctx.strokeStyle = BRUSH_COLOR;
  ctx.fillStyle = BRUSH_COLOR;
  ctx.lineWidth = BRUSH_WIDTH_PX;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const stroke of strokes) {
    const [first, ...rest] = stroke;
    if (!first) continue;

    // 점 하나짜리 획(탭)은 선 길이가 0이라 stroke()로는 보이지 않으므로 원으로 찍는다.
    if (rest.length === 0) {
      ctx.beginPath();
      ctx.arc(first.x, first.y, BRUSH_WIDTH_PX / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of rest) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
}
