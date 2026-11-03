// 캐릭터 애니메이션 클립 이름과 전환 시간 (SPEC §4). character.glb의 클립 이름이 이 값과 같아야 재생된다.

export const CHARACTER_CLIPS = {
  idle: "Idle",
  walk: "Walk",
} as const;

export const CLIP_CROSS_FADE_SEC = 0.2;
