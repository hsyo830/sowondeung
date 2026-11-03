"use client";

import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";

import { isChannelSilent } from "@/lib/audio/audioSettings";
import type { AudioChannel } from "@/lib/audio/audioSettings";
import { useAudioSettingsStore } from "@/stores/audioSettingsStore";

import { GameDialog } from "./GameDialog";
import { MusicNoteIcon, SoundFooterScene, SpeakerIcon, WaveformIcon } from "./MenuIcons";

interface ChannelCardProps {
  channel: AudioChannel;
  label: string;
  /** 음소거 버튼의 스크린 리더용 이름 ("배경음악 음소거") */
  shortLabel: string;
  icon: ReactNode;
}

/** 슬라이더 채움 길이를 CSS 변수로 넘긴다 (globals.css .sound-slider) */
type SliderStyle = CSSProperties & Record<"--fill", string>;

/**
 * 채널 하나의 설정 카드. 값은 store에서 읽고 바로 store에 쓴다 (임시 로컬 state 없음 → 움직이는 즉시 음량 반영).
 * 음소거해도 슬라이더 값은 그대로 보인다 (해제하면 그 값으로 돌아간다).
 */
function ChannelCard({ channel, label, shortLabel, icon }: ChannelCardProps) {
  const settings = useAudioSettingsStore((state) => state.settings[channel]);
  const setVolume = useAudioSettingsStore((state) => state.setVolume);
  const toggleMute = useAudioSettingsStore((state) => state.toggleMute);
  const sliderId = useId();
  const isSilent = isChannelSilent(settings);
  const sliderStyle: SliderStyle = { "--fill": `${settings.volume}%` };

  return (
    <div className="rounded-2xl border border-[#ecd9b3] bg-[#fffdf7]/85 px-4 pt-3 pb-4">
      <div className="flex items-center gap-3">
        <span className="text-[#6b4a2c]">{icon}</span>
        <label htmlFor={sliderId} className="flex-1 font-bold text-[#4a2f1a]">
          {label}
        </label>
        <button
          type="button"
          onClick={() => toggleMute(channel)}
          // 토글 버튼: 이름은 고정하고 눌림 상태(aria-pressed)로 음소거 여부를 알린다
          aria-pressed={settings.muted}
          aria-label={`${shortLabel} 음소거`}
          className="grid h-9 w-9 place-items-center rounded-full border border-[#d9b26f] bg-[#fffaf0] text-[#4a2f1a] transition-colors hover:bg-[#f7e7c6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9853f] active:bg-[#efd9ad] aria-pressed:bg-[#f0dfbd] aria-pressed:text-[#9a7a55]"
        >
          <SpeakerIcon muted={isSilent} className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3 pl-9">
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={settings.volume}
          onChange={(event) => setVolume(channel, event.currentTarget.valueAsNumber)}
          aria-valuetext={settings.muted ? `${settings.volume}%, 음소거됨` : `${settings.volume}%`}
          data-silent={isSilent}
          style={sliderStyle}
          className="sound-slider min-w-0 flex-1"
        />
        <output
          htmlFor={sliderId}
          className={`w-11 text-right text-sm font-semibold tabular-nums ${isSilent ? "text-[#b39a7a]" : "text-[#6b4a2c]"}`}
        >
          {settings.volume}%
        </output>
      </div>
    </div>
  );
}

interface SoundSettingsDialogProps {
  onClose: () => void;
}

export function SoundSettingsDialog({ onClose }: SoundSettingsDialogProps) {
  return (
    <GameDialog
      title="소리 설정"
      medallion={<MusicNoteIcon className="h-8 w-8 text-[#a8692d]" />}
      onClose={onClose}
      widthClassName="w-[min(28rem,calc(100vw-2rem))]"
      footer={<SoundFooterScene className="block h-14 w-full" />}
    >
      <div className="flex flex-col gap-3">
        <ChannelCard
          channel="bgm"
          label="배경음악 (BGM)"
          shortLabel="배경음악"
          icon={<MusicNoteIcon className="h-6 w-6" />}
        />
        <ChannelCard
          channel="sfx"
          label="효과음 (SFX)"
          shortLabel="효과음"
          icon={<WaveformIcon className="h-6 w-6" />}
        />
      </div>
      <p className="mt-3 text-center text-xs leading-relaxed break-keep text-[#8a6a48]">
        브라우저 정책상 소리는 화면을 처음 클릭하거나 키를 누른 뒤부터 재생돼요.
        <br />
        설정은 이 브라우저에 저장돼요.
      </p>
    </GameDialog>
  );
}
