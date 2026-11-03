// 상호작용 판정·실행의 런타임 연결부. 순수 함수(resolveInteraction)에 현재 store 값과 플레이어 ref를 넣어 부른다.
// 버튼 표시(InteractionSensor, 매 프레임)와 실행(InteractionPrompt, 클릭·E키)이 모두 이 파일을 거친다 (SPEC §8).

import { INTERACTION_TARGETS, resolveInteraction } from "@/lib/game/interaction";
import type { InteractionRules, ResolvedInteraction } from "@/lib/game/interaction";
import { INTERACTION_CONFIG, PLAYER_CONFIG } from "@/lib/game/worldConfig";
import { useGameStore } from "@/stores/gameStore";
import type { InteractionActionId, InteractionId, PlayerState } from "@/types/game";

const INTERACTION_RULES: InteractionRules = {
  playerRadius: PLAYER_CONFIG.radius,
  reach: INTERACTION_CONFIG.reach,
  keepReach: INTERACTION_CONFIG.keepReach,
  facingCos: INTERACTION_CONFIG.facingCos,
  keepFacingCos: INTERACTION_CONFIG.keepFacingCos,
};

/** 지금 이 순간의 store 값과 플레이어 위치·방향으로 상호작용 대상을 판정한다 */
export function resolveCurrentInteraction(player: PlayerState): ResolvedInteraction | null {
  const { mode, held, nearbyInteractionId } = useGameStore.getState();
  return resolveInteraction(
    INTERACTION_TARGETS,
    player,
    { mode, status: held.status },
    INTERACTION_RULES,
    nearbyInteractionId,
  );
}

/**
 * 버튼 클릭·E키 실행 (SPEC §8 실행 시점 재검증). 버튼이 보였다는 사실을 믿지 않고 **지금** 다시 판정한다.
 * 1. 모드 EXPLORE  2. 현재 위치에서 거리  3. 현재 방향  4. 현재 상태에서 그 액션이 가능한가
 * 하나라도 아니면 아무것도 하지 않는다. 마지막으로 store 액션이 전이 규칙으로 한 번 더 확인한다.
 */
export function executeInteraction(
  player: PlayerState,
  targetId: InteractionId,
  actionId: InteractionActionId,
): boolean {
  const resolved = resolveCurrentInteraction(player);
  if (!resolved || resolved.id !== targetId || !resolved.actionIds.includes(actionId)) return false;
  return useGameStore.getState().runInteractionAction(actionId);
}
