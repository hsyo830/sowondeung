/** 손글씨 Canvas의 논리 좌표 (512 × 768, DPR과 무관) */
export interface Point {
  x: number;
  y: number;
}

/** 한 획 = 점 목록. SPEC §5: 손글씨의 단일 원본은 획 배열이다. */
export type Stroke = readonly Point[];
