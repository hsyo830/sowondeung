// 소리 설정(배경음악·효과음 볼륨과 음소거)의 순수 함수. store·localStorage·Web Audio는 모르고 값만 다룬다.
//
// 음소거는 볼륨을 0으로 바꾸지 않고 muted 플래그만 켠다. 그래서 '음소거 전 볼륨'을 따로 저장하지 않아도
// 해제하면 원래 볼륨으로 돌아간다 (볼륨 값이 그대로 남아 있으므로).

export type AudioChannel = "bgm" | "sfx";

export interface ChannelSettings {
  /** 0~100 정수 (슬라이더 값) */
  volume: number;
  muted: boolean;
}

export type AudioSettings = Readonly<Record<AudioChannel, ChannelSettings>>;

export const AUDIO_CHANNELS: readonly AudioChannel[] = ["bgm", "sfx"];

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  bgm: { volume: 60, muted: false },
  sfx: { volume: 80, muted: false },
};

export function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 0;
  return Math.min(100, Math.max(0, Math.round(volume)));
}

/**
 * 슬라이더로 볼륨을 바꾼다. 음소거 중이면 함께 해제한다 (슬라이더를 움직였는데 소리가 안 나면 고장처럼 보인다).
 * 값이 같으면 같은 객체를 돌려준다 → store가 불필요하게 갱신되지 않는다.
 */
export function setChannelVolume(
  settings: AudioSettings,
  channel: AudioChannel,
  volume: number,
): AudioSettings {
  const next: ChannelSettings = { volume: clampVolume(volume), muted: false };
  const current = settings[channel];
  if (current.volume === next.volume && current.muted === next.muted) return settings;
  return { ...settings, [channel]: next };
}

/**
 * 스피커 버튼. 음소거 ↔ 해제. 해제하면 음소거 전 볼륨(그대로 남아 있는 volume)으로 돌아간다.
 * 볼륨이 0인 채로 해제하면 들리지 않으므로 기본 볼륨으로 되돌린다.
 */
export function toggleChannelMute(settings: AudioSettings, channel: AudioChannel): AudioSettings {
  const current = settings[channel];
  if (current.muted || current.volume === 0) {
    const volume = current.volume === 0 ? DEFAULT_AUDIO_SETTINGS[channel].volume : current.volume;
    return { ...settings, [channel]: { volume, muted: false } };
  }
  return { ...settings, [channel]: { ...current, muted: true } };
}

/** 지금 이 채널이 들리지 않는가 (음소거 또는 볼륨 0). 스피커 아이콘 표시에 쓴다 */
export function isChannelSilent(channel: ChannelSettings): boolean {
  return channel.muted || channel.volume === 0;
}

/**
 * 슬라이더 값 → 실제 증폭 배율 (0~1). 사람의 귀는 크기를 로그로 느껴서, 값을 그대로 쓰면
 * 슬라이더 오른쪽 절반에서는 거의 차이가 없고 왼쪽 끝에서만 확 바뀐다. 제곱 곡선으로 고르게 만든다.
 */
export function getChannelGain(channel: ChannelSettings): number {
  if (isChannelSilent(channel)) return 0;
  const ratio = clampVolume(channel.volume) / 100;
  return ratio * ratio;
}

function parseChannel(raw: unknown, fallback: ChannelSettings): ChannelSettings {
  if (typeof raw !== "object" || raw === null) return fallback;
  const { volume, muted } = raw as { volume?: unknown; muted?: unknown };
  return {
    volume:
      typeof volume === "number" && Number.isFinite(volume) ? clampVolume(volume) : fallback.volume,
    muted: typeof muted === "boolean" ? muted : fallback.muted,
  };
}

/**
 * localStorage에서 읽은 문자열 → 설정. 저장 값은 사용자가 고칠 수 있는 외부 입력이라
 * 형식이 틀리거나 일부만 있어도 예외 없이 기본값으로 채운다.
 */
export function parseAudioSettings(serialized: string | null): AudioSettings {
  if (serialized === null) return DEFAULT_AUDIO_SETTINGS;
  let raw: unknown;
  try {
    raw = JSON.parse(serialized);
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
  if (typeof raw !== "object" || raw === null) return DEFAULT_AUDIO_SETTINGS;
  const { bgm, sfx } = raw as { bgm?: unknown; sfx?: unknown };
  return {
    bgm: parseChannel(bgm, DEFAULT_AUDIO_SETTINGS.bgm),
    sfx: parseChannel(sfx, DEFAULT_AUDIO_SETTINGS.sfx),
  };
}

export function serializeAudioSettings(settings: AudioSettings): string {
  return JSON.stringify({ bgm: settings.bgm, sfx: settings.sfx });
}
