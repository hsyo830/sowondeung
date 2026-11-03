// 천등 상태 전이와 모드 전환 가능 여부 (SPEC §7). 모두 순수 함수다.
// store 액션은 이 함수를 호출해서 결과만 반영한다. 허용되지 않은 전이는 null/false를 돌려주고 예외를 던지지 않는다.

import type { LanternColorId } from "@/constants/lanternColors";
import { hasInk } from "@/lib/writing/strokes";
import type { GameMode, HeldLantern, LanternStatus, Stroke } from "@/types/game";

/** 천등이 없는 상태. NONE에서는 id·colorId·strokes가 의미 없으므로 고정값을 둔다 */
export const EMPTY_HELD_LANTERN: HeldLantern = {
  id: "",
  colorId: "red",
  strokes: [],
  status: "NONE",
};

export type LanternAction =
  /** 색상 선택. NONE이면 새 천등(newId)을 받고, BLANK이면 색만 바꾼다 */
  | { type: "receive"; colorId: LanternColorId; newId: string }
  /** 작성 완료. 1획 이상일 때만 */
  | { type: "finishWriting"; strokes: readonly Stroke[] }
  /** 점화 (4단계에서 store에 연결) */
  | { type: "light" }
  /** 발사 (4단계에서 store에 연결. 발사 천등 목록 추가는 store가 한다) */
  | { type: "launch" };

/**
 * SPEC §7 전이 표.
 *
 * | 액션          | 허용 이전 상태               | 결과                          |
 * | ------------- | ---------------------------- | ----------------------------- |
 * | receive       | NONE, BLANK                  | BLANK (BLANK이면 색상만 교체) |
 * | finishWriting | BLANK, WRITTEN (strokes ≥ 1) | WRITTEN                       |
 * | light         | WRITTEN                      | LIT                           |
 * | launch        | LIT                          | NONE                          |
 *
 * 표에 없는 전이는 null (상태 변화 없음). 입력 객체는 바꾸지 않는다.
 */
export function applyLanternAction(
  held: Readonly<HeldLantern>,
  action: LanternAction,
): HeldLantern | null {
  switch (action.type) {
    case "receive":
      if (held.status === "NONE") {
        return { id: action.newId, colorId: action.colorId, strokes: [], status: "BLANK" };
      }
      // BLANK에서는 같은 천등의 색만 바꾼다 (새 천등을 하나 더 받지 않는다 = 중복 수령 방지)
      if (held.status === "BLANK") return { ...held, colorId: action.colorId };
      return null;
    case "finishWriting":
      if (held.status !== "BLANK" && held.status !== "WRITTEN") return null;
      if (!hasInk(action.strokes)) return null;
      return { ...held, strokes: action.strokes, status: "WRITTEN" };
    case "light":
      return held.status === "WRITTEN" ? { ...held, status: "LIT" } : null;
    case "launch":
      return held.status === "LIT" ? EMPTY_HELD_LANTERN : null;
  }
}

/** 색상 선택 UI를 열 수 있는가: 탐색 중 + 천등이 없거나(받기) 빈 종이(색 다시 고르기) */
export function canOpenColorSelect(status: LanternStatus, mode: GameMode): boolean {
  return mode === "EXPLORE" && (status === "NONE" || status === "BLANK");
}

/** 작성 모드에 들어갈 수 있는가: 탐색 중 + 빈 종이(작성) 또는 작성 완료(수정) (SPEC §7) */
export function canOpenWriting(status: LanternStatus, mode: GameMode): boolean {
  return mode === "EXPLORE" && (status === "BLANK" || status === "WRITTEN");
}

/**
 * 발사 동작(LAUNCHING)을 시작할 수 있는가: 탐색 중 + 불 붙은 천등 (SPEC §6 STEP 4, 3초 홀드 완료 시점).
 * 시작해도 천등은 아직 손에 있다(LIT). 실제 분리(launch 전이)는 Throw에서 손을 놓는 순간이다.
 */
export function canBeginLaunch(status: LanternStatus, mode: GameMode): boolean {
  return mode === "EXPLORE" && status === "LIT";
}
