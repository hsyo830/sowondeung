import { create } from "zustand";

import type { LanternColorId } from "@/constants/lanternColors";
import {
  EMPTY_HELD_LANTERN,
  applyLanternAction,
  canOpenColorSelect,
  canOpenWriting,
} from "@/lib/game/lanternTransitions";
import type {
  GameMode,
  HeldLantern,
  InteractionActionId,
  InteractionId,
  Stroke,
} from "@/types/game";

/**
 * 게임 전체가 공유하는, **이벤트로 바뀌는** 값만 둔다 (SPEC §7, CODING_CONVENTIONS §5).
 * - 플레이어 위치·카메라·손 위치처럼 매 프레임 바뀌는 값은 ref에 둔다.
 * - 작성 중 초안 획은 확정 전 임시 값이라 WritingOverlay의 로컬 state에 둔다. 여기에는 확정본(held.strokes)만 있다.
 * - Texture·Geometry 같은 Three 객체는 넣지 않는다 (직렬화할 수 있는 값만).
 * - 4단계에서 flying(발사 천등 목록)·toast와 lightLantern·launchLantern을 추가한다.
 */
export interface GameState {
  held: HeldLantern;
  mode: GameMode;
  /** 지금 버튼을 보여 줄 상호작용 대상. 매 프레임 판정하지만 **값이 바뀔 때만** 쓴다 (SPEC §7 예외) */
  nearbyInteractionId: InteractionId | null;

  /** 색상 선택 UI 열기 (천등 받기 · 색상 다시 고르기). EXPLORE + NONE·BLANK에서만 */
  openColorSelect: () => boolean;
  /** 색상 선택 확정. COLOR_SELECT 모드에서만 받고, 성공하면 EXPLORE로 돌아간다 */
  receiveLantern: (colorId: LanternColorId) => boolean;
  /** 작성 모드 열기 (작성 · 수정). EXPLORE + BLANK·WRITTEN에서만 */
  openWriting: () => boolean;
  /** 작성 완료. WRITING 모드 + 1획 이상에서만 받고, 성공하면 EXPLORE로 돌아간다 */
  finishWriting: (strokes: readonly Stroke[]) => boolean;
  /** 색상 선택·작성 UI 닫기 (취소). 천등 데이터는 바꾸지 않는다 */
  closeOverlay: () => void;
  setNearbyInteraction: (id: InteractionId | null) => void;
  /** 상호작용 버튼·E키가 실행하는 액션. 각 액션이 전이 규칙으로 다시 확인한다 (SPEC §8 실행 재검증 4번) */
  runInteractionAction: (actionId: InteractionActionId) => boolean;
}

/** 새 천등 id. 발사 천등 목록의 key로도 쓰므로 세션 안에서만 고유하면 된다 */
let lanternSequence = 0;
function createLanternId(): string {
  lanternSequence += 1;
  return `lantern-${lanternSequence}`;
}

export const useGameStore = create<GameState>()((set, get) => ({
  held: EMPTY_HELD_LANTERN,
  mode: "EXPLORE",
  nearbyInteractionId: null,

  openColorSelect: () => {
    const { held, mode } = get();
    if (!canOpenColorSelect(held.status, mode)) return false;
    set({ mode: "COLOR_SELECT" });
    return true;
  },

  receiveLantern: (colorId) => {
    const { held, mode } = get();
    // 색상 버튼을 두 번 눌러도 첫 번째에서 EXPLORE로 바뀌므로 두 번째는 거부된다 (중복 실행 방지)
    if (mode !== "COLOR_SELECT") return false;
    const next = applyLanternAction(held, {
      type: "receive",
      colorId,
      // BLANK에서 색만 바꿀 때는 쓰이지 않는다. NONE일 때만 새 id를 만든다
      newId: held.status === "NONE" ? createLanternId() : held.id,
    });
    if (!next) return false;
    set({ held: next, mode: "EXPLORE" });
    return true;
  },

  openWriting: () => {
    const { held, mode } = get();
    if (!canOpenWriting(held.status, mode)) return false;
    set({ mode: "WRITING" });
    return true;
  },

  finishWriting: (strokes) => {
    const { held, mode } = get();
    if (mode !== "WRITING") return false;
    const next = applyLanternAction(held, { type: "finishWriting", strokes });
    if (!next) return false;
    set({ held: next, mode: "EXPLORE" });
    return true;
  },

  closeOverlay: () => {
    if (get().mode === "EXPLORE") return;
    set({ mode: "EXPLORE" });
  },

  setNearbyInteraction: (id) => {
    if (get().nearbyInteractionId === id) return;
    set({ nearbyInteractionId: id });
  },

  runInteractionAction: (actionId) => {
    const actions = get();
    switch (actionId) {
      case "receiveLantern":
      case "reselectColor":
        return actions.openColorSelect();
      case "writeWish":
      case "editWish":
        return actions.openWriting();
    }
  },
}));
