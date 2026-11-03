"use client";

import { useLayoutEffect, useRef } from "react";
import type { PointerEvent } from "react";

import { FACE_CANVAS_HEIGHT, FACE_CANVAS_WIDTH } from "@/constants/writing";
import { drawLanternFace } from "@/lib/lantern/drawLanternFace";
import { toLogicalPoint } from "@/lib/writing/coords";
import { appendPoint, clearStrokes, hasInk, startStroke, undoStroke } from "@/lib/writing/strokes";
import type { Stroke } from "@/types/game";

interface WritingCanvasProps {
  colorHex: string;
  /** 초안 획. 소유자는 부모(확정 전 임시 상태 → 부모의 로컬 state, SPEC §5) */
  strokes: readonly Stroke[];
  /**
   * 획 변경 요청. 이전 값을 받는 함수 형태로 넘긴다.
   * pointermove가 리렌더보다 빠르게 연속으로 와도 이전 렌더의 strokes를 기준으로 덮어쓰지 않게 하기 위해서다.
   */
  onStrokesChange: (update: (prev: readonly Stroke[]) => Stroke[]) => void;
  /** 1획 이상일 때만 호출된다 */
  onComplete: (strokes: readonly Stroke[]) => void;
}

/**
 * 손글씨 입력 Canvas. 내부 해상도는 512 × 768로 고정하고 표시 크기만 CSS로 바꾼다 (SPEC §5).
 * 좌표 계산과 획 변경은 순수 함수에, 그리기는 drawLanternFace에 맡기고 여기서는 입력만 연결한다.
 */
export function WritingCanvas({
  colorHex,
  strokes,
  onStrokesChange,
  onComplete,
}: WritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** 지금 그리고 있는 포인터. 여러 손가락이 닿아도 첫 번째만 처리한다 (SPEC §5) */
  const activePointerIdRef = useRef<number | null>(null);

  // 획·색이 바뀔 때마다 처음부터 다시 그린다. 3D 텍스처와 같은 함수라 결과가 항상 같다.
  // 페인트 전에 그려서 이전 그림이 한 프레임 보이는 깜빡임을 없앤다.
  useLayoutEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    drawLanternFace(ctx, colorHex, strokes);
  }, [colorHex, strokes]);

  function getLogicalPoint(e: PointerEvent<HTMLCanvasElement>) {
    return toLogicalPoint(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
  }

  function handlePointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (activePointerIdRef.current !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    activePointerIdRef.current = e.pointerId;
    // 캡처하면 Canvas 밖으로 나가도 move/up이 계속 들어온다. 좌표는 toLogicalPoint가 경계로 clamp한다.
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getLogicalPoint(e);
    onStrokesChange((prev) => startStroke(prev, point));
  }

  function handlePointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (e.pointerId !== activePointerIdRef.current) return;
    const point = getLogicalPoint(e);
    onStrokesChange((prev) => appendPoint(prev, point));
  }

  /** pointerup·pointercancel·lostpointercapture 모두 같은 방식으로 획을 끝낸다 */
  function handlePointerEnd(e: PointerEvent<HTMLCanvasElement>) {
    if (e.pointerId !== activePointerIdRef.current) return;
    activePointerIdRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  const canComplete = hasInk(strokes);

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={FACE_CANVAS_WIDTH}
        height={FACE_CANVAS_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
        // touch-none = touch-action: none. 필기 중 스크롤·확대를 막는다.
        className="h-auto w-full cursor-crosshair touch-none rounded-md shadow-lg select-none"
        aria-label="소원 작성 영역"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onStrokesChange((prev) => undoStroke(prev))}
          disabled={strokes.length === 0}
          className="flex-1 rounded bg-zinc-700 px-3 py-2 text-sm disabled:opacity-40"
        >
          되돌리기
        </button>
        <button
          type="button"
          onClick={() => onStrokesChange(() => clearStrokes())}
          disabled={strokes.length === 0}
          className="flex-1 rounded bg-zinc-700 px-3 py-2 text-sm disabled:opacity-40"
        >
          전체 지우기
        </button>
        <button
          type="button"
          onClick={() => onComplete(strokes)}
          disabled={!canComplete}
          className="flex-1 rounded bg-amber-500 px-3 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-40"
        >
          완료
        </button>
      </div>
    </div>
  );
}
