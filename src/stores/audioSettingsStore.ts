import { create } from "zustand";

import {
  DEFAULT_AUDIO_SETTINGS,
  parseAudioSettings,
  serializeAudioSettings,
  setChannelVolume,
  toggleChannelMute,
} from "@/lib/audio/audioSettings";
import type { AudioChannel, AudioSettings } from "@/lib/audio/audioSettings";

const STORAGE_KEY = "sowondeung:audio-settings:v1";

/**
 * 저장된 설정을 읽는다. 서버(window 없음)·저장소 차단(사생활 보호 모드 등)이면 기본값.
 * 이 store를 읽는 컴포넌트는 모두 ssr: false로 불러오는 GameCanvas 아래에 있어 서버에서 렌더링되지 않는다.
 * 그래서 첫 클라이언트 렌더부터 저장 값을 써도 서버 HTML과 비교할 대상이 없다 (Hydration 불일치 없음).
 */
function readStoredSettings(): AudioSettings {
  if (typeof window === "undefined") return DEFAULT_AUDIO_SETTINGS;
  try {
    return parseAudioSettings(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

function writeStoredSettings(settings: AudioSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeAudioSettings(settings));
  } catch {
    // 저장소가 막혀 있으면 이번 세션 동안만 유지한다
  }
}

interface AudioSettingsState {
  settings: AudioSettings;
  setVolume: (channel: AudioChannel, volume: number) => void;
  toggleMute: (channel: AudioChannel) => void;
}

/** 소리 설정 (이벤트로 바뀌고 모달·오디오 연결부가 함께 읽는 값). 게임 store와 분리한다 */
export const useAudioSettingsStore = create<AudioSettingsState>()((set, get) => {
  function update(next: AudioSettings) {
    if (next === get().settings) return;
    set({ settings: next });
    writeStoredSettings(next);
  }
  return {
    settings: readStoredSettings(),
    setVolume: (channel, volume) => update(setChannelVolume(get().settings, channel, volume)),
    toggleMute: (channel) => update(toggleChannelMute(get().settings, channel)),
  };
});
