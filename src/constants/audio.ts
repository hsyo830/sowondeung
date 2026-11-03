// 오디오 파일·재생 값의 단일 원본. 파일 측정값(무음 구간·걸음 구간)은 DEV_LOG '플레이 방법·사운드' 기록.
// 세기(gain)는 파일마다 녹음 크기가 달라 맞춘 초기값이다. 브라우저에서 직접 들어 보고 조정한다.

/** 반복 재생하는 소리 */
export type LoopSoundId = "bgm" | "campfire";
/** 한 번 재생하는 효과음 */
export type OneShotSoundId = "uiClick" | "paper" | "ignite" | "launch";
/** 디코딩해서 메모리에 두는 소리 (BGM은 스트리밍이라 제외) */
export type BufferedSoundId = OneShotSoundId | "footstep" | "campfire";

/**
 * public/audio 파일 경로. **null = 아직 파일이 없다** → 요청하지 않고 재생도 하지 않는다 (404·콘솔 오류 없음).
 * 파일을 받으면 경로만 채우면 된다.
 */
export const AUDIO_FILES: Record<BufferedSoundId | "bgm", string | null> = {
  bgm: "/audio/bgm.mp3",
  campfire: "/audio/campfire.mp3",
  footstep: "/audio/footstep.mp3",
  uiClick: "/audio/ui-click.mp3",
  paper: "/audio/paper.mp3",
  ignite: "/audio/ignite.mp3",
  launch: "/audio/launch.mp3",
};

export interface OneShotConfig {
  /** 채널 볼륨에 곱하는 기본 세기 */
  gain: number;
  /** 앞쪽 무음을 건너뛰는 재생 시작 위치 (초). 그대로 틀면 클릭 후 소리가 늦게 들린다 */
  offsetSec: number;
  /** 이 시간 안에 다시 요청하면 무시한다 (빠른 연타·이벤트 중복으로 겹쳐 커지지 않게) */
  cooldownMs: number;
}

export const ONE_SHOT_CONFIG: Record<OneShotSoundId, OneShotConfig> = {
  // ui-click.mp3: 소리 0.14~0.28초, 최대 RMS 0.12
  uiClick: { gain: 0.35, offsetSec: 0.12, cooldownMs: 70 },
  // paper.mp3: 소리 0.46~1.18초, 최대 RMS 0.033
  paper: { gain: 0.9, offsetSec: 0.42, cooldownMs: 200 },
  // ignite.mp3 (2.28초): 앞 0.38초 무음, 소리 0.40~0.74초 + 약한 꼬리 ~1.5초, 최대 RMS 0.26 (클릭의 약 3배)
  ignite: { gain: 0.12, offsetSec: 0.36, cooldownMs: 500 },
  // launch.mp3 (9.8초): 앞 0.80초 무음, 1.4초 부근이 가장 크고(최대 RMS 0.39) ~5초 이후 무음
  launch: { gain: 0.1, offsetSec: 0.75, cooldownMs: 500 },
};

/**
 * campfire.mp3 (79.5초): 앞 0.35초·뒤 0.56초가 무음이다. 통째로 반복하면 0.9초씩 소리가 끊겨서
 * 소리가 있는 구간만 반복한다 (AudioBufferSourceNode loopStart/loopEnd).
 */
export const CAMPFIRE_LOOP = {
  loopStartSec: 0.35,
  loopEndSec: 78.98,
  /** 모닥불 바로 옆(근접도 1)일 때의 세기 */
  maxGain: 0.6,
  /** 근접도가 바뀔 때 따라가는 시간 상수 (초). 걷는 동안 음량이 계단처럼 바뀌지 않게 한다 */
  smoothingSec: 0.25,
  /** 처음 켤 때 0에서 올라오는 시간 상수 (초) */
  fadeInSec: 0.8,
} as const;

export const BGM_CONFIG = {
  /** bgm.mp3 최대 RMS 0.30. 효과음·모닥불을 덮지 않게 낮춘다 */
  gain: 0.35,
  /** 처음 재생할 때 0에서 올라오는 시간 상수 (초) */
  fadeInSec: 1.2,
} as const;

/** 볼륨 슬라이더·음소거 변경을 따라가는 시간 상수 (초). 즉시 반영되지만 '틱' 소리 없이 바뀐다 */
export const CHANNEL_GAIN_SMOOTHING_SEC = 0.03;

export interface FootstepSegment {
  startSec: number;
  durationSec: number;
  /** 이 구간의 최대 세기 (가장 큰 걸음 = 1). 걸음마다 세기를 맞추는 데 쓴다 */
  peak: number;
}

/**
 * footstep.mp3 (11.26초)는 한 걸음이 아니라 **걸음 14개를 0.73~1.0초 간격으로** 녹음한 파일이다.
 * 간격이 Walk 클립(반 주기 0.52초)과 맞지 않아 통째로 반복하지 않고, 걸음 하나씩 잘라 발이 닿는 순간마다 재생한다.
 * 구간 = 10ms RMS가 최대의 3%를 넘는 범위 + 앞뒤 20ms (headless Chrome decodeAudioData 측정).
 */
export const FOOTSTEP_SEGMENTS: readonly FootstepSegment[] = [
  { startSec: 0.15, durationSec: 0.28, peak: 0.42 },
  { startSec: 0.92, durationSec: 0.31, peak: 0.38 },
  { startSec: 1.82, durationSec: 0.34, peak: 0.5 },
  { startSec: 2.73, durationSec: 0.38, peak: 1 },
  { startSec: 3.49, durationSec: 0.28, peak: 0.82 },
  { startSec: 4.42, durationSec: 0.4, peak: 0.37 },
  { startSec: 5.31, durationSec: 0.25, peak: 0.68 },
  { startSec: 6.1, durationSec: 0.26, peak: 0.83 },
  { startSec: 6.92, durationSec: 0.25, peak: 0.42 },
  { startSec: 7.7, durationSec: 0.25, peak: 0.63 },
  { startSec: 8.45, durationSec: 0.27, peak: 0.53 },
  { startSec: 9.17, durationSec: 0.29, peak: 0.65 },
  { startSec: 9.9, durationSec: 0.36, peak: 0.83 },
  { startSec: 10.84, durationSec: 0.26, peak: 0.56 },
];

export const FOOTSTEP_CONFIG = {
  /** footstep.mp3는 최대 RMS 0.015로 매우 작게 녹음되어 있어 1보다 크게 키운다 */
  gain: 2.2,
  /** 걸음마다 맞출 목표 세기 (peak 기준). 0.6보다 작은 걸음은 키우고 큰 걸음은 줄인다 */
  targetPeak: 0.6,
  /** 세기 보정 배율 범위. 너무 작은 걸음을 지나치게 키우지 않는다 */
  minNormalize: 0.6,
  maxNormalize: 1.5,
  /** 매 걸음 조금씩 다르게 (같은 소리가 기계적으로 반복되지 않게) */
  gainJitter: 0.12,
  playbackRateJitter: 0.05,
  /** 구간 끝을 잘라 낼 때 '틱' 소리가 나지 않게 줄이는 시간 (초) */
  releaseSec: 0.04,
} as const;
