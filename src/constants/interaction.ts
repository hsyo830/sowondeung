import type { InteractionActionId } from "@/types/game";

/** 상호작용 버튼 문구 (SPEC §6 테이블 상태별 버튼, STEP 3 모닥불) */
export const INTERACTION_ACTION_LABELS: Record<InteractionActionId, string> = {
  receiveLantern: "천등 받기",
  writeWish: "소원 작성하기",
  reselectColor: "색상 다시 고르기",
  editWish: "소원 수정하기",
  lightLantern: "불 붙이기",
};

/** 주 액션(첫 번째 버튼)을 실행하는 키. KeyboardEvent.code 기준이라 한글 입력 상태와 무관하다 */
export const INTERACT_KEY_CODE = "KeyE";
/** 색상 선택·작성 UI를 닫는 키 */
export const CLOSE_OVERLAY_KEY = "Escape";

/**
 * '천등 날리기' 홀드 키 (SPEC §6 STEP 4). 근접 상호작용(E)과 구분한다. KeyboardEvent.code 기준이라 한글 입력 상태와 무관하다
 */
export const LAUNCH_KEY_CODE = "KeyF";
/** 발사까지 누르고 있어야 하는 시간 (SPEC §6 STEP 4: 3초 홀드) */
export const LAUNCH_HOLD_DURATION_MS = 3000;
