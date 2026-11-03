import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUDIO_SETTINGS,
  clampVolume,
  getChannelGain,
  isChannelSilent,
  parseAudioSettings,
  serializeAudioSettings,
  setChannelVolume,
  toggleChannelMute,
} from "./audioSettings";
import type { AudioSettings } from "./audioSettings";

const SETTINGS: AudioSettings = {
  bgm: { volume: 70, muted: false },
  sfx: { volume: 40, muted: false },
};

describe("볼륨 슬라이더", () => {
  it("0~100 정수로 맞춘다", () => {
    expect(clampVolume(-5)).toBe(0);
    expect(clampVolume(140)).toBe(100);
    expect(clampVolume(33.6)).toBe(34);
    expect(clampVolume(Number.NaN)).toBe(0);
  });

  it("한 채널만 바뀌고 다른 채널은 그대로다 (BGM·효과음 독립)", () => {
    const next = setChannelVolume(SETTINGS, "bgm", 20);
    expect(next.bgm).toEqual({ volume: 20, muted: false });
    expect(next.sfx).toBe(SETTINGS.sfx);
  });

  it("음소거 중에 슬라이더를 움직이면 음소거가 풀린다", () => {
    const muted = toggleChannelMute(SETTINGS, "sfx");
    expect(setChannelVolume(muted, "sfx", 55).sfx).toEqual({ volume: 55, muted: false });
  });

  it("값이 같으면 같은 객체를 돌려준다", () => {
    expect(setChannelVolume(SETTINGS, "bgm", 70)).toBe(SETTINGS);
  });
});

describe("음소거", () => {
  it("음소거해도 볼륨 값은 남고, 해제하면 그 볼륨으로 돌아간다", () => {
    const muted = toggleChannelMute(SETTINGS, "bgm");
    expect(muted.bgm).toEqual({ volume: 70, muted: true });
    expect(getChannelGain(muted.bgm)).toBe(0);
    const restored = toggleChannelMute(muted, "bgm");
    expect(restored.bgm).toEqual({ volume: 70, muted: false });
  });

  it("한 채널을 음소거해도 다른 채널은 그대로 들린다", () => {
    const muted = toggleChannelMute(SETTINGS, "bgm");
    expect(muted.sfx).toBe(SETTINGS.sfx);
    expect(getChannelGain(muted.sfx)).toBeGreaterThan(0);
  });

  it("볼륨 0에서 스피커를 누르면 기본 볼륨으로 들리게 한다", () => {
    const zero = setChannelVolume(SETTINGS, "sfx", 0);
    expect(isChannelSilent(zero.sfx)).toBe(true);
    expect(toggleChannelMute(zero, "sfx").sfx).toEqual({
      volume: DEFAULT_AUDIO_SETTINGS.sfx.volume,
      muted: false,
    });
  });
});

describe("실제 증폭 배율", () => {
  it("제곱 곡선: 0 → 0, 50 → 0.25, 100 → 1", () => {
    expect(getChannelGain({ volume: 0, muted: false })).toBe(0);
    expect(getChannelGain({ volume: 50, muted: false })).toBeCloseTo(0.25);
    expect(getChannelGain({ volume: 100, muted: false })).toBe(1);
  });
});

describe("저장 값 읽기", () => {
  it("저장한 값을 그대로 복원한다", () => {
    const muted = toggleChannelMute(setChannelVolume(SETTINGS, "sfx", 15), "bgm");
    expect(parseAudioSettings(serializeAudioSettings(muted))).toEqual(muted);
  });

  it("값이 없거나 깨졌으면 기본값", () => {
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings("{not json")).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings("42")).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings("null")).toEqual(DEFAULT_AUDIO_SETTINGS);
  });

  it("일부만 맞으면 맞는 값만 쓰고 나머지는 기본값, 범위 밖 볼륨은 잘라 낸다", () => {
    const parsed = parseAudioSettings(
      JSON.stringify({ bgm: { volume: 250, muted: "yes" }, sfx: { muted: true } }),
    );
    expect(parsed.bgm).toEqual({ volume: 100, muted: DEFAULT_AUDIO_SETTINGS.bgm.muted });
    expect(parsed.sfx).toEqual({ volume: DEFAULT_AUDIO_SETTINGS.sfx.volume, muted: true });
  });
});
