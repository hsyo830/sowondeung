// 발사 동작(Idle/Walk → Throw → Praying → Idle)의 단계 전이와 천등을 놓는 시점 판정 (SPEC §6 STEP 4). 모두 순수 함수다.
// CharacterModel이 store 모드와 AnimationMixer 상태를 넣어 호출하고, 결과에 따라 클립만 전환한다.
// 천등 상태(LIT → NONE)와 모드(LAUNCHING ↔ EXPLORE)는 store가 관리한다. 여기서는 애니메이션 순서만 다룬다.

/** NONE = Idle/Walk, THROW = 던지기 재생 중, PRAY = 기도 재생 중 */
export type LaunchAnimationPhase = "NONE" | "THROW" | "PRAY";

export type LaunchAnimationEvent =
  /** 발사 모드(LAUNCHING)가 시작됐다 (3초 홀드 완료) */
  | "start"
  /** Throw 클립이 끝났다 (LoopOnce의 finished 이벤트) */
  | "throwFinished"
  /** Praying 클립이 끝났다 */
  | "prayFinished";

/**
 * | 이벤트        | 허용 이전 단계 | 결과  |
 * | ------------- | -------------- | ----- |
 * | start         | NONE           | THROW |
 * | throwFinished | THROW          | PRAY  |
 * | prayFinished  | PRAY           | NONE  |
 *
 * 표에 없는 조합은 null (무시). 같은 이벤트가 두 번 와도 두 번째는 무시되므로 클립이 중복 전환되지 않는다.
 * 발사 모드인 동안 매 프레임 start를 보내도 NONE일 때 한 번만 시작된다.
 */
export function getNextLaunchPhase(
  phase: LaunchAnimationPhase,
  event: LaunchAnimationEvent,
): LaunchAnimationPhase | null {
  switch (event) {
    case "start":
      return phase === "NONE" ? "THROW" : null;
    case "throwFinished":
      return phase === "THROW" ? "PRAY" : null;
    case "prayFinished":
      return phase === "PRAY" ? "NONE" : null;
  }
}

/**
 * Throw의 클립 시간이 놓는 시점을 지났고 아직 놓지 않았으면 true.
 * '같다'가 아니라 '지났다'로 판정하므로 프레임이 놓는 시점을 건너뛰어도(큰 delta) 지난 뒤 첫 판정에서 한 번 true가 된다.
 */
export function shouldReleaseLantern(
  clipTimeSec: number,
  releaseSec: number,
  hasReleased: boolean,
): boolean {
  return !hasReleased && clipTimeSec >= releaseSec;
}
