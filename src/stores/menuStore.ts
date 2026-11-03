import { create } from "zustand";

import { isGameReady } from "@/stores/gameLoadingStore";

/** 우측 상단 버튼으로 여는 창 */
export type GameMenuId = "guide" | "sound";

interface MenuState {
  /** 열린 창. 한 번에 하나만 열린다 */
  openMenuId: GameMenuId | null;
  openMenu: (id: GameMenuId) => void;
  closeMenu: () => void;
}

/**
 * 플레이 방법·소리 설정 창. 게임 모드(GameMode)와 **따로** 둔다:
 * 창은 COLOR_SELECT·WRITING·LAUNCHING 어느 모드 위에서도 열 수 있고, 닫으면 그 모드 그대로 돌아가야 하기 때문이다.
 * 창이 열려 있는 동안 게임 입력(이동·E·F·ESC로 작성 닫기)은 isGameInputBlocked()로 막는다.
 */
export const useMenuStore = create<MenuState>()((set) => ({
  openMenuId: null,
  openMenu: (id) => set({ openMenuId: id }),
  closeMenu: () => set({ openMenuId: null }),
}));

/**
 * 게임 키 입력을 무시해야 하는가 (최초 로딩이 끝나지 않음, 또는 창이 열려 있음). 이벤트 핸들러·useFrame에서 읽는다.
 * 이동·E·F·ESC 처리부가 모두 이 함수 하나로 확인하므로 로딩 중 잠금도 여기서 함께 한다.
 */
export function isGameInputBlocked(): boolean {
  return !isGameReady() || useMenuStore.getState().openMenuId !== null;
}
