import type { Point, Stroke } from "@/types/game";

// 모든 함수는 원본 배열을 바꾸지 않고 새 배열을 반환한다.
// React state 비교가 참조 기준이고, 발사 시 같은 배열을 다른 천등과 참조로 공유하기 때문이다 (SPEC §5).

/** 새 획을 시작한다 (pointerdown) */
export function startStroke(strokes: readonly Stroke[], point: Point): Stroke[] {
  return [...strokes, [point]];
}

/** 마지막 획에 점을 추가한다 (pointermove). 진행 중인 획이 없으면 변경하지 않는다. */
export function appendPoint(strokes: readonly Stroke[], point: Point): Stroke[] {
  const last = strokes.at(-1);
  if (!last) return [...strokes];
  return [...strokes.slice(0, -1), [...last, point]];
}

/** 마지막 획을 제거한다 */
export function undoStroke(strokes: readonly Stroke[]): Stroke[] {
  return strokes.slice(0, -1);
}

/** 모든 획을 지운다 */
export function clearStrokes(): Stroke[] {
  return [];
}

/** 점이 하나라도 있는 획이 있으면 true. 완료 버튼 활성화 조건 (SPEC §6 STEP 2) */
export function hasInk(strokes: readonly Stroke[]): boolean {
  return strokes.some((stroke) => stroke.length > 0);
}
