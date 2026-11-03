"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

import { INTERACTION_ACTION_LABELS, INTERACT_KEY_CODE } from "@/constants/interaction";
import { INTERACTION_TARGETS } from "@/lib/game/interaction";
import { useGameStore } from "@/stores/gameStore";
import { isGameInputBlocked } from "@/stores/menuStore";
import type { InteractionActionId, PlayerState } from "@/types/game";

import { executeInteraction, resolveCurrentInteraction } from "./interactionRuntime";

const NO_ACTIONS: readonly InteractionActionId[] = [];

interface InteractionPromptProps {
  playerRef: RefObject<PlayerState>;
  /** InteractionSensor가 화면 위치를 써 주는 요소 */
  anchorRef: RefObject<HTMLDivElement | null>;
}

/**
 * 탁자·모닥불 위에 뜨는 상태별 상호작용 버튼 (SPEC §6·§8).
 * - 표시: store의 nearbyInteractionId + 천등 상태로 버튼 목록을 렌더 중에 계산한다 (중복 state 없음).
 * - 실행: 클릭·E키 모두 executeInteraction이 **실행 시점에** 같은 판정 함수로 다시 확인한다.
 * - E키는 첫 번째(주) 액션만 실행한다. 보조 액션(색상 다시 고르기)은 클릭으로만 실행한다.
 */
export function InteractionPrompt({ playerRef, anchorRef }: InteractionPromptProps) {
  const nearbyId = useGameStore((state) => state.nearbyInteractionId);
  const isExploring = useGameStore((state) => state.mode === "EXPLORE");
  const status = useGameStore((state) => state.held.status);

  const target = INTERACTION_TARGETS.find((candidate) => candidate.id === nearbyId);
  const actionIds = target && isExploring ? target.getActionIds(status) : NO_ACTIONS;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // SPEC §4 입력 공통 규칙: 꾹 누르고 있을 때의 반복 입력으로 여러 번 실행하지 않는다
      if (event.code !== INTERACT_KEY_CODE || event.repeat) return;
      // 플레이 방법·소리 설정 창이 열려 있으면 실행하지 않는다
      if (isGameInputBlocked()) return;
      const player = playerRef.current;
      const resolved = resolveCurrentInteraction(player);
      const primaryActionId = resolved?.actionIds[0];
      if (!resolved || !primaryActionId) return;
      executeInteraction(player, resolved.id, primaryActionId);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playerRef]);

  return (
    // 위치는 InteractionSensor가 매 프레임 transform으로 쓴다. 이 요소 자체는 클릭을 막지 않는다
    <div ref={anchorRef} className="pointer-events-none invisible absolute top-0 left-0">
      {target && actionIds.length > 0 && (
        <div className="flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1.5 pb-1">
          {actionIds.map((actionId, index) => {
            const isPrimary = index === 0;
            return (
              <button
                key={actionId}
                type="button"
                // SPEC §8: 클릭 후 버튼에 포커스가 남아 Space·Enter로 다시 실행되지 않게 포커스를 주지 않는다
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => executeInteraction(playerRef.current, target.id, actionId)}
                className={
                  isPrimary
                    ? "pointer-events-auto flex items-center gap-2 rounded-full border border-[#c79a5b] bg-[#fdf3dc] py-1.5 pr-4 pl-1.5 text-sm font-semibold whitespace-nowrap text-[#4a2f1a] shadow-lg transition-transform hover:-translate-y-0.5"
                    : "pointer-events-auto rounded-full border border-[#c79a5b]/70 bg-[#2b1d12]/80 px-3.5 py-1 text-xs whitespace-nowrap text-[#fdf3dc] shadow-md backdrop-blur-sm transition-transform hover:-translate-y-0.5"
                }
              >
                {isPrimary && (
                  <kbd className="rounded-full bg-[#4a2f1a] px-2 py-0.5 font-sans text-xs text-[#fdf3dc]">
                    E
                  </kbd>
                )}
                {INTERACTION_ACTION_LABELS[actionId]}
              </button>
            );
          })}
          {/* 버튼이 가리키는 대상 지점 */}
          <span className="h-4 w-px bg-[#fdf3dc]/70" />
        </div>
      )}
    </div>
  );
}
