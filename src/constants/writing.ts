/**
 * 손글씨 Canvas 논리 크기 (SPEC §5). DPR과 상관없이 고정한다.
 * 천등 앞면 1.2 × 1.8과 같은 2:3 비율이라 2D 좌표와 텍스처 UV가 1:1로 대응한다.
 */
export const FACE_CANVAS_WIDTH = 512;
export const FACE_CANVAS_HEIGHT = 768;

/** 검정 붓: 고정 두께 (SPEC §5, 필압 없음) */
export const BRUSH_WIDTH_PX = 12;
export const BRUSH_COLOR = "#1b1b1b";
