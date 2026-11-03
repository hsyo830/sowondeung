import { create } from "zustand";

/** loading = 최초 로딩 화면 표시 중, ready = 게임 시작 가능, failed = 필수 에셋·초기화 실패 */
export type GameLoadingStatus = "loading" | "ready" | "failed";

interface GameLoadingState {
  status: GameLoadingStatus;
  /** 게임 준비 완료. loading에서만 바뀐다 (실패 뒤에 늦게 와도 실패 화면을 덮지 않는다) */
  markReady: () => boolean;
  /** 필수 에셋 로딩·초기화 실패 (오류 경계, 바닥 격자 없음). 이미 실패면 false */
  markFailed: () => boolean;
}

/**
 * 최초 로딩 상태. 게임 모드(GameMode)·창(menuStore)과 따로 둔다: 게임 로직과 무관한 화면 수명 상태다.
 * 페이지 로드마다 한 번 loading → ready(또는 failed)로만 간다. 다시 시도는 페이지를 새로 불러오므로 되돌리는 액션이 없다.
 * 로딩이 끝나기 전에는 게임 키 입력을 isGameInputBlocked()로 막는다 (menuStore).
 */
export const useGameLoadingStore = create<GameLoadingState>()((set, get) => ({
  status: "loading",
  markReady: () => {
    if (get().status !== "loading") return false;
    set({ status: "ready" });
    return true;
  },
  markFailed: () => {
    if (get().status === "failed") return false;
    set({ status: "failed" });
    return true;
  },
}));

/** 게임이 시작 가능한 상태인가. 이벤트 핸들러·useFrame에서 읽는다 */
export function isGameReady(): boolean {
  return useGameLoadingStore.getState().status === "ready";
}
