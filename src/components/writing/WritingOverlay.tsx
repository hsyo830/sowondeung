"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

import { WritingCanvas } from "@/components/writing/WritingCanvas";
import { CLOSE_OVERLAY_KEY } from "@/constants/interaction";
import { getLanternColorHex } from "@/constants/lanternColors";
import { useGameStore } from "@/stores/gameStore";
import { isGameInputBlocked } from "@/stores/menuStore";
import type { Stroke } from "@/types/game";

interface WritingOverlayProps {
  /** WritingPaper(Canvas 안)가 3D 종이의 화면 위치를 써 주는 요소 */
  paperOverlayRef: RefObject<HTMLDivElement | null>;
}

/**
 * 소원 작성 UI (SPEC §5·§6 STEP 2). 작성 모드에서만 마운트한다.
 * - 초안 획은 확정 전 임시 값이라 **로컬 state**다. 마운트할 때 store의 확정본으로 시작한다 (수정 = 기존 글씨 이어 쓰기).
 * - 완료할 때만 store(finishWriting)에 반영한다. 취소하면 초안을 버리므로 마지막 확정본이 그대로 남는다.
 * - 필기·되돌리기·전체 지우기·완료 버튼은 1단계 WritingCanvas를 그대로 쓴다.
 */
export function WritingOverlay({ paperOverlayRef }: WritingOverlayProps) {
  const colorId = useGameStore((state) => state.held.colorId);
  const committedStrokes = useGameStore((state) => state.held.strokes);
  const isEditing = useGameStore((state) => state.held.status === "WRITTEN");
  const [draftStrokes, setDraftStrokes] = useState<readonly Stroke[]>(committedStrokes);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== CLOSE_OVERLAY_KEY) return;
      // 창이 열려 있으면 ESC는 그 창만 닫는다 (창의 cancel은 keydown 전파가 끝난 뒤라 이 시점엔 아직 열려 있다)
      if (isGameInputBlocked()) return;
      useGameStore.getState().closeOverlay();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleComplete(strokes: readonly Stroke[]) {
    // 1획 이상인지, 작성 모드인지는 store 액션이 전이 규칙으로 다시 확인한다
    useGameStore.getState().finishWriting(strokes);
  }

  return (
    <div className="absolute inset-0">
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[#c79a5b]/60 bg-[#2b1d12]/80 py-1.5 pr-1.5 pl-4 text-sm text-[#fdf3dc] shadow-lg backdrop-blur-sm">
          <span>{isEditing ? "소원을 고쳐 써 주세요" : "소원등 종이에 소원을 적어 주세요"}</span>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => useGameStore.getState().closeOverlay()}
            className="rounded-full bg-[#fdf3dc]/15 px-3 py-1 text-xs hover:bg-[#fdf3dc]/25"
          >
            취소 <span className="text-[#fdf3dc]/60">ESC</span>
          </button>
        </div>
      </div>

      {/* 위치·너비는 WritingPaper가 매 프레임 직접 쓴다. 첫 위치가 정해지기 전에는 숨겨 둔다 */}
      <div ref={paperOverlayRef} className="invisible absolute top-0 left-0 text-zinc-100">
        <WritingCanvas
          colorHex={getLanternColorHex(colorId)}
          strokes={draftStrokes}
          onStrokesChange={setDraftStrokes}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
