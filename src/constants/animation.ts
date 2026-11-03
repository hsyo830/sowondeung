// 캐릭터 애니메이션 클립 이름과 전환 시간 (SPEC §4). character.glb의 클립 이름이 이 값과 같아야 재생된다.

export const CHARACTER_CLIPS = {
  idle: "Idle",
  walk: "Walk",
  /** 천등 날리기 (SPEC §6 STEP 4). 한 번만 재생 */
  throw: "Throw",
  /** 날린 직후 기도. 한 번만 재생 */
  pray: "Praying",
} as const;

export const CLIP_CROSS_FADE_SEC = 0.2;

/**
 * Walk 클립(1.03초)에서 발이 바닥에 닿는 순간 (클립 시간, 초). 발소리를 이 시점에 재생한다.
 * 측정: 발 본(Left_Foot·RightFoot)이 가장 앞으로 나간 뒤(왼발 0.23초·오른발 0.74초) 바닥 높이(≈0.020)로 내려온 순간.
 * 왼발 0.33초 · 오른발 0.85초, 간격 0.52초 = 반 주기. Walk 클립을 바꾸면 다시 측정한다.
 */
export const WALK_FOOTSTEP_CONTACT_SEC: readonly number[] = [0.33, 0.85];

/**
 * 발사 동작 Idle/Walk → Throw → Praying → Idle (SPEC §6 STEP 4).
 * 시간 값은 모두 **클립 시간**(초) 기준이다. Throw 클립(5.77초) 분석 결과는 DEV_LOG 'Throw·Praying 연동' 기록.
 */
export const LAUNCH_ANIMATION = {
  /** Throw 앞부분 0~0.6초는 거의 정지 자세라 건너뛴다 */
  throwStartSec: 0.6,
  /** Throw 재생 속도. 홀드 완료 → 놓기까지 (3.33 − 0.6) / 1.3 ≈ 2.1초 */
  throwTimeScale: 1.3,
  /**
   * 천등을 놓는 순간. 손이 머리 위 최고점(3.27초)을 지나 몸 앞으로 뻗은 지점이다.
   * 이때 천등 중심이 몸 축에서 수평 0.40이라 getLaunchPose가 위치를 보정하지 않는다 (3.27초는 0.28 → 바깥으로 밀려 튄다).
   */
  throwReleaseSec: 3.33,
  /** Idle/Walk → Throw */
  enterFadeSec: 0.25,
  /** Throw 끝 자세 → Praying. 두 자세 차이가 커서 Idle/Walk 전환보다 길게 섞는다 */
  throwToPrayFadeSec: 0.4,
  /** Praying → Idle */
  prayToIdleFadeSec: 0.5,
} as const;
