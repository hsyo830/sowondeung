import { describe, expect, it } from "vitest";

import { FACE_CANVAS_HEIGHT, FACE_CANVAS_WIDTH } from "@/constants/writing";

import { toLogicalPoint } from "./coords";

describe("toLogicalPoint", () => {
  it("CSS 크기가 논리 크기와 같으면 rect 기준 좌표를 그대로 반환한다", () => {
    const rect = { left: 10, top: 20, width: 512, height: 768 };
    expect(toLogicalPoint(110, 220, rect)).toEqual({ x: 100, y: 200 });
  });

  it("CSS 크기가 논리 크기의 절반이면 2배로 환산한다", () => {
    const rect = { left: 0, top: 0, width: 256, height: 384 };
    expect(toLogicalPoint(128, 192, rect)).toEqual({ x: 256, y: 384 });
  });

  it("CSS 크기가 더 크면 축소해서 환산한다 (가로·세로 독립)", () => {
    const rect = { left: 100, top: 50, width: 1024, height: 1536 };
    expect(toLogicalPoint(100 + 1024, 50 + 768, rect)).toEqual({
      x: FACE_CANVAS_WIDTH,
      y: FACE_CANVAS_HEIGHT / 2,
    });
  });

  it("모서리 좌표가 논리 Canvas의 모서리로 대응한다", () => {
    const rect = { left: 0, top: 0, width: 300, height: 450 };
    expect(toLogicalPoint(0, 0, rect)).toEqual({ x: 0, y: 0 });
    expect(toLogicalPoint(300, 450, rect)).toEqual({ x: FACE_CANVAS_WIDTH, y: FACE_CANVAS_HEIGHT });
  });

  it("경계 밖 좌표는 Canvas 범위로 clamp한다", () => {
    const rect = { left: 0, top: 0, width: 256, height: 384 };
    expect(toLogicalPoint(-50, -10, rect)).toEqual({ x: 0, y: 0 });
    expect(toLogicalPoint(999, 999, rect)).toEqual({ x: FACE_CANVAS_WIDTH, y: FACE_CANVAS_HEIGHT });
    expect(toLogicalPoint(-5, 192, rect)).toEqual({ x: 0, y: 384 });
  });

  it("크기가 0인 rect에서도 NaN을 만들지 않는다", () => {
    const rect = { left: 0, top: 0, width: 0, height: 0 };
    expect(toLogicalPoint(10, 10, rect)).toEqual({ x: 0, y: 0 });
  });
});
