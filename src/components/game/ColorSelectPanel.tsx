"use client";

import { useEffect } from "react";

import { CLOSE_OVERLAY_KEY } from "@/constants/interaction";
import { LANTERN_COLORS } from "@/constants/lanternColors";
import { useGameStore } from "@/stores/gameStore";
import { isGameInputBlocked } from "@/stores/menuStore";

/**
 * 천등 색상 선택 (SPEC §6 STEP 1). COLOR_SELECT 모드에서만 마운트한다.
 * 고르면 receiveLantern → BLANK(또는 BLANK에서 색만 교체). 닫기·ESC는 상태를 바꾸지 않는다.
 */
export function ColorSelectPanel() {
  const status = useGameStore((state) => state.held.status);
  const currentColorId = useGameStore((state) => state.held.colorId);
  const isReselecting = status === "BLANK";

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

  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-6">
      <section
        aria-label="소원등 색상 선택"
        className="w-full max-w-md rounded-2xl border border-[#c79a5b]/60 bg-[#2b1d12]/85 p-5 text-[#fdf3dc] shadow-2xl backdrop-blur-sm"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isReselecting ? "색상을 다시 골라 주세요" : "소원등 색을 골라 주세요"}
          </h2>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => useGameStore.getState().closeOverlay()}
            className="rounded-full bg-[#fdf3dc]/15 px-3 py-1 text-xs hover:bg-[#fdf3dc]/25"
          >
            닫기 <span className="text-[#fdf3dc]/60">ESC</span>
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {LANTERN_COLORS.map((color) => {
            const isCurrent = isReselecting && color.id === currentColorId;
            return (
              <button
                key={color.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => useGameStore.getState().receiveLantern(color.id)}
                aria-pressed={isCurrent}
                className="group flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-[#fdf3dc]/10 aria-pressed:bg-[#fdf3dc]/15"
              >
                <span
                  className="h-16 w-12 rounded-md shadow-md ring-[#fdf3dc] ring-offset-2 ring-offset-[#2b1d12] transition-transform group-hover:-translate-y-0.5 group-aria-pressed:ring-2"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-sm">{color.theme}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
