// '천등 날리기' 3초 홀드 입력 (SPEC §6 STEP 4). 모두 순수 함수다 (현재 시각은 인자로 받는다).
//
// 홀드는 '한 입력 장치를 떼지 않고 계속 누른 시간'만 센다.
// - 이미 누르는 중에 들어온 시작(F키 반복 keydown, 다른 장치의 pointerdown)은 무시한다 → 시작 시각이 뒤로 밀리거나 겹치지 않는다.
// - 시작한 장치를 떼면 바로 처음(0%)으로 돌아간다 → 짧게 여러 번 눌러 진행률을 쌓을 수 없다.

/** 홀드를 시작한 입력 장치 */
export type HoldSource = "key" | "pointer";

export type HoldState =
  | { phase: "IDLE" }
  | {
      phase: "HOLDING";
      source: HoldSource;
      /** performance.now() 기준 시작 시각 (ms) */
      startedAtMs: number;
    };

export const IDLE_HOLD: HoldState = { phase: "IDLE" };

/** 누르기 시작. 이미 누르는 중이면 같은 객체를 그대로 돌려준다 (변화 없음) */
export function startHold(hold: HoldState, source: HoldSource, nowMs: number): HoldState {
  if (hold.phase === "HOLDING") return hold;
  return { phase: "HOLDING", source, startedAtMs: nowMs };
}

/** 떼기. 홀드를 시작한 장치를 뗐을 때만 IDLE로 돌아가고, 다른 장치를 떼면 변화 없다 */
export function releaseHold(hold: HoldState, source: HoldSource): HoldState {
  if (hold.phase === "HOLDING" && hold.source === source) return IDLE_HOLD;
  return hold;
}

/** 진행률 0~1. 누르고 있지 않으면 0. 시계가 거꾸로 가도 0 아래로 내려가지 않는다 */
export function getHoldProgress(hold: HoldState, nowMs: number, durationMs: number): number {
  if (hold.phase === "IDLE") return 0;
  if (durationMs <= 0) return 1;
  return Math.min(Math.max((nowMs - hold.startedAtMs) / durationMs, 0), 1);
}

/** 홀드 완료(발사 시점)인가 */
export function isHoldComplete(hold: HoldState, nowMs: number, durationMs: number): boolean {
  return hold.phase === "HOLDING" && getHoldProgress(hold, nowMs, durationMs) >= 1;
}
