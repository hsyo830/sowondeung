import { create } from "zustand";

import type { LanternColorId } from "@/constants/lanternColors";
import { appendFlyingLantern, removeFlyingLanternById } from "@/lib/game/flight";
import {
  EMPTY_HELD_LANTERN,
  applyLanternAction,
  canOpenColorSelect,
  canOpenWriting,
} from "@/lib/game/lanternTransitions";
import type {
  FlyingLanternData,
  GameMode,
  HeldLantern,
  InteractionActionId,
  InteractionId,
  LaunchPose,
  Stroke,
} from "@/types/game";

/**
 * 게임 전체가 공유하는, **이벤트로 바뀌는** 값만 둔다 (SPEC §7, CODING_CONVENTIONS §5).
 * - 플레이어 위치·카메라·손 위치처럼 매 프레임 바뀌는 값은 ref에 둔다.
 * - 작성 중 초안 획은 확정 전 임시 값이라 WritingOverlay의 로컬 state에 둔다. 여기에는 확정본(held.strokes)만 있다.
 * - Texture·Geometry 같은 Three 객체는 넣지 않는다 (직렬화할 수 있는 값만).
 * - 발사 천등의 위치·회전은 매 프레임 바뀌므로 여기 두지 않는다. 여기에는 발사 순간의 출발 정보와 색·획만 있다.
 * - SPEC §7의 toast는 쓰는 곳이 없어 두지 않았다 (BLANK 안내는 HUD 상태 표시줄).
 */
export interface GameState {
  held: HeldLantern;
  mode: GameMode;
  /** 날아가는 천등 (SPEC §7). 순서 = 발사 순서, 최대 MAX_FLYING_LANTERNS개 */
  flying: readonly FlyingLanternData[];
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
  /** 점화 (WRITTEN → LIT). EXPLORE에서만. 이미 LIT이면 거부되므로 중복 점화가 없다 */
  lightLantern: () => boolean;
  /**
   * 발사 (LIT → NONE + 발사 천등 추가). **store 한 번의 갱신**으로 손 천등을 비우고 발사 목록에 더한다 (SPEC §5 전환 순서).
   * LIT일 때만 성공하므로 같은 프레임에 두 번 불려도 두 번째는 거부된다 (액션 단의 멱등성).
   */
  launchLantern: (pose: LaunchPose) => boolean;
  /** 수명이 끝난 발사 천등 제거. 없는 id면 false (상태 변화 없음) */
  removeFlyingLantern: (id: string) => boolean;
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
  flying: [],
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

  lightLantern: () => {
    const { held, mode } = get();
    if (mode !== "EXPLORE") return false;
    const next = applyLanternAction(held, { type: "light" });
    if (!next) return false;
    set({ held: next });
    return true;
  },

  launchLantern: (pose) => {
    const { held, mode, flying } = get();
    if (mode !== "EXPLORE") return false;
    const next = applyLanternAction(held, { type: "launch" });
    if (!next) return false;
    // 발사 순간의 색·획을 발사 천등이 그대로 가져간다. 획은 같은 배열 참조이고, 텍스처는 FlyingLantern이 새로 만든다.
    // 손 천등은 EMPTY_HELD_LANTERN(빈 획)으로 바뀌고, 다음에 받는 천등은 새 id·빈 획으로 시작한다 → 이전 데이터가 섞이지 않는다.
    const launched: FlyingLanternData = {
      id: held.id,
      colorId: held.colorId,
      strokes: held.strokes,
      spawn: pose.spawn,
      yaw: pose.yaw,
      drift: pose.drift,
    };
    set({ held: next, flying: appendFlyingLantern(flying, launched) });
    return true;
  },

  removeFlyingLantern: (id) => {
    const next = removeFlyingLanternById(get().flying, id);
    if (!next) return false;
    set({ flying: next });
    return true;
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
      case "lightLantern":
        return actions.lightLantern();
    }
  },
}));
