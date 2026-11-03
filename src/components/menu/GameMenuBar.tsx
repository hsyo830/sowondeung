"use client";

import type { ReactNode } from "react";

import { isChannelSilent } from "@/lib/audio/audioSettings";
import { useAudioSettingsStore } from "@/stores/audioSettingsStore";
import { useMenuStore } from "@/stores/menuStore";

import { QuestionIcon, SpeakerIcon } from "./MenuIcons";
import { PlayGuideDialog } from "./PlayGuideDialog";
import { SoundSettingsDialog } from "./SoundSettingsDialog";

interface MenuButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
}

function MenuButton({ label, onClick, children }: MenuButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="dialog"
      title={label}
      // SPEC §8: 마우스로 누른 뒤 버튼에 포커스가 남지 않게 한다. Tab으로는 그대로 선택할 수 있다
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-xl border border-[#d9b26f] bg-[#fdf3dc]/95 text-[#4a2f1a] shadow-[0_2px_6px_rgba(29,20,38,0.35)] transition-[background-color,translate] hover:-translate-y-px hover:bg-[#fff8ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fdf3dc] active:translate-y-0 active:bg-[#f0dfbd]"
    >
      {children}
    </button>
  );
}

/**
 * 우측 상단 플레이 방법(?)·소리 설정(스피커) 버튼과 각 창. 열린 창은 menuStore 하나로 정한다.
 * 게임 모드와 상관없이 언제나 보인다 (작성·발사 중에도 설정을 바꿀 수 있다).
 */
export function GameMenuBar() {
  const openMenuId = useMenuStore((state) => state.openMenuId);
  const openMenu = useMenuStore((state) => state.openMenu);
  const closeMenu = useMenuStore((state) => state.closeMenu);
  const isAllSilent = useAudioSettingsStore(
    (state) => isChannelSilent(state.settings.bgm) && isChannelSilent(state.settings.sfx),
  );

  return (
    <>
      <div className="pointer-events-auto absolute top-4 right-4 flex gap-2">
        <MenuButton label="플레이 방법" onClick={() => openMenu("guide")}>
          <QuestionIcon className="h-6 w-6" />
        </MenuButton>
        <MenuButton label="소리 설정" onClick={() => openMenu("sound")}>
          <SpeakerIcon muted={isAllSilent} className="h-6 w-6" />
        </MenuButton>
      </div>
      {openMenuId === "guide" && <PlayGuideDialog onClose={closeMenu} />}
      {openMenuId === "sound" && <SoundSettingsDialog onClose={closeMenu} />}
    </>
  );
}
