"use client";

import { useEffect, useRef } from "react";

import { LAUNCH_HOLD_DURATION_MS, LAUNCH_KEY_CODE } from "@/constants/interaction";
import {
  IDLE_HOLD,
  getHoldProgress,
  isHoldComplete,
  releaseHold,
  startHold,
} from "@/lib/game/launchHold";
import type { HoldSource, HoldState } from "@/lib/game/launchHold";
import { useGameStore } from "@/stores/gameStore";
import { isGameInputBlocked, useMenuStore } from "@/stores/menuStore";

/**
 * '천등 날리기' 3초 홀드 (SPEC §6 STEP 4). LIT + 탐색 모드일 때만 위치와 상관없이 표시한다.
 * 근접 상호작용 버튼(E, 대상 위에 뜸)과 구분해 화면 아래 가운데에 고정한다.
 * 홀드가 끝나면 발사 동작(LAUNCHING)만 시작한다. 천등은 Throw에서 손을 놓는 순간 떨어진다 (CharacterModel → launchHeldLantern).
 */
export function LaunchHoldButton() {
  const isVisible = useGameStore(
    (state) => state.held.status === "LIT" && state.mode === "EXPLORE",
  );
  // 조건이 사라지면 언마운트 → 정리 함수가 진행 중인 홀드와 rAF를 취소한다
  return isVisible ? <LaunchHoldPanel /> : null;
}

/** 진행률 표시를 DOM에 직접 쓴다 (매 프레임 React state를 바꾸지 않는다) */
interface HoldView {
  root: HTMLElement;
  fill: HTMLElement;
  percent: HTMLElement;
}

function renderProgress(view: HoldView | null, progress: number, isHolding: boolean): void {
  if (!view) return;
  view.fill.style.transform = `scaleX(${progress})`;
  view.percent.textContent = `${Math.floor(progress * 100)}%`;
  view.root.dataset.holding = isHolding ? "true" : "false";
  view.root.setAttribute("aria-valuenow", String(Math.floor(progress * 100)));
}

/**
 * 홀드 입력·진행률·발사. 모든 가변 값은 effect 안의 지역 변수와 ref에 있고, React state는 쓰지 않는다.
 * - 진행률 = performance.now() 경과 시간 (setTimeout 누적 아님). 누르는 동안만 rAF로 DOM을 갱신한다.
 * - 시작: F keydown(반복 keydown 무시) 또는 버튼 pointerdown(주 버튼). 이미 누르는 중이면 무시한다.
 * - 취소: 시작한 장치의 keyup·pointerup·pointerleave·pointercancel, window blur, 탭 숨김, 모드·상태 변경, 언마운트.
 *   떼면 0%로 돌아가므로 반복 클릭으로 시간을 쌓을 수 없다.
 * - 완료: ref 가드로 **한 번만** beginLaunch를 부른다. store 액션도 EXPLORE + LIT일 때만 성공한다 (이중 방어).
 *   성공하면 모드가 LAUNCHING이 되어 이 패널이 언마운트된다.
 */
function LaunchHoldPanel() {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const button = buttonRef.current;
    const fill = fillRef.current;
    const percent = percentRef.current;
    const view = root && fill && percent ? { root, fill, percent } : null;

    let hold: HoldState = IDLE_HOLD;
    let frameId: number | null = null;
    let hasLaunched = false;

    function stopLoop() {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
    }
    function cancelHold() {
      hold = IDLE_HOLD;
      stopLoop();
      renderProgress(view, 0, false);
    }
    function complete() {
      // 가드를 먼저 켠다. 이후 같은 프레임에 들어온 입력·tick은 아무것도 하지 않는다
      hasLaunched = true;
      hold = IDLE_HOLD;
      stopLoop();
      renderProgress(view, 1, false);
      if (!useGameStore.getState().beginLaunch()) {
        // 시작이 거부되면(이미 시작됨·모드 변경) 처음 상태로 돌아간다. 성공하면 LAUNCHING이 되어 언마운트된다
        hasLaunched = false;
        renderProgress(view, 0, false);
      }
    }
    function tick() {
      const now = performance.now();
      if (isHoldComplete(hold, now, LAUNCH_HOLD_DURATION_MS)) {
        frameId = null;
        complete();
        return;
      }
      renderProgress(view, getHoldProgress(hold, now, LAUNCH_HOLD_DURATION_MS), true);
      frameId = requestAnimationFrame(tick);
    }
    function begin(source: HoldSource) {
      if (hasLaunched) return;
      const { held, mode } = useGameStore.getState();
      if (held.status !== "LIT" || mode !== "EXPLORE") return;
      // 플레이 방법·소리 설정 창이 열려 있으면 시작하지 않는다
      if (isGameInputBlocked()) return;
      const next = startHold(hold, source, performance.now());
      if (next === hold) return; // 이미 누르는 중 (반복 keydown·다른 장치) → 시작 시각을 바꾸지 않는다
      hold = next;
      renderProgress(view, 0, true);
      stopLoop();
      frameId = requestAnimationFrame(tick);
    }
    function release(source: HoldSource) {
      const next = releaseHold(hold, source);
      if (next !== hold) cancelHold();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== LAUNCH_KEY_CODE) return;
      // Ctrl+F 같은 브라우저 단축키는 막지 않는다
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      // SPEC §4 입력 공통 규칙: 꾹 누를 때의 반복 keydown은 무시한다 (startHold도 다시 막는다)
      if (event.repeat) return;
      begin("key");
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === LAUNCH_KEY_CODE) release("key");
    }
    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      begin("pointer");
    }
    function handlePointerEnd() {
      release("pointer");
    }
    // SPEC §8: 버튼에 포커스가 남지 않게 한다 (Space·Enter로 시작하는 경로를 만들지 않는다)
    function preventFocus(event: MouseEvent) {
      event.preventDefault();
    }
    function preventContextMenu(event: Event) {
      event.preventDefault();
    }
    function handleVisibilityChange() {
      if (document.hidden) cancelHold();
    }
    // 작성·색상 선택 모드가 되거나 LIT이 아니게 되면 즉시 취소한다 (언마운트보다 먼저, 같은 동기 흐름에서)
    const unsubscribe = useGameStore.subscribe((state) => {
      if (state.mode !== "EXPLORE" || state.held.status !== "LIT") cancelHold();
    });
    // F를 누르는 중에 창이 열리면 취소한다 (닫은 뒤 다시 처음부터 눌러야 한다)
    const unsubscribeMenu = useMenuStore.subscribe((state) => {
      if (state.openMenuId !== null) cancelHold();
    });

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", cancelHold);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    button?.addEventListener("pointerdown", handlePointerDown);
    button?.addEventListener("pointerup", handlePointerEnd);
    button?.addEventListener("pointerleave", handlePointerEnd);
    button?.addEventListener("pointercancel", handlePointerEnd);
    button?.addEventListener("mousedown", preventFocus);
    button?.addEventListener("contextmenu", preventContextMenu);
    return () => {
      unsubscribe();
      unsubscribeMenu();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", cancelHold);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      button?.removeEventListener("pointerdown", handlePointerDown);
      button?.removeEventListener("pointerup", handlePointerEnd);
      button?.removeEventListener("pointerleave", handlePointerEnd);
      button?.removeEventListener("pointercancel", handlePointerEnd);
      button?.removeEventListener("mousedown", preventFocus);
      button?.removeEventListener("contextmenu", preventContextMenu);
      cancelHold();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
      <div
        ref={rootRef}
        role="progressbar"
        aria-label="천등 날리기 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        data-holding="false"
        className="group flex flex-col items-center gap-2"
      >
        <p className="rounded-full bg-[#1d1426]/70 px-3 py-1 text-xs text-[#fdf3dc]/85 backdrop-blur-sm transition-opacity group-data-[holding=true]:opacity-0">
          F키나 버튼을 3초 동안 누르고 있으면 천등이 날아올라요
        </p>
        <button
          ref={buttonRef}
          type="button"
          // 홀드 버튼은 떼는 순간 click이 생긴다. 누를 때마다 클릭 효과음이 나지 않게 한다 (GameAudio)
          data-sfx="off"
          className="pointer-events-auto relative flex w-64 touch-none items-center gap-3 overflow-hidden rounded-2xl border border-[#f2b36b]/50 bg-[#1d1426]/80 py-2.5 pr-4 pl-2.5 text-[#fdf3dc] shadow-[0_0_24px_rgba(255,162,82,0.25)] backdrop-blur-sm transition-shadow select-none group-data-[holding=true]:shadow-[0_0_36px_rgba(255,170,90,0.55)]"
        >
          {/* 진행률 채움. 너비 대신 scaleX만 바꿔 레이아웃 계산 없이 갱신한다 */}
          <span
            ref={fillRef}
            aria-hidden
            className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-[#f08a3c]/45 to-[#ffd27a]/55"
          />
          <kbd className="relative rounded-lg border border-[#f2b36b]/60 bg-[#2b1d12] px-2 py-0.5 font-sans text-sm font-semibold text-[#ffd9a0]">
            F
          </kbd>
          <span className="relative flex-1 text-left text-sm font-semibold tracking-wide">
            천등 날리기
          </span>
          <span
            ref={percentRef}
            className="relative w-10 text-right font-mono text-xs text-[#ffd9a0] tabular-nums"
          >
            0%
          </span>
        </button>
      </div>
    </div>
  );
}
