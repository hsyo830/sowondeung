"use client";

import type { RefObject } from "react";

import { ColorSelectPanel } from "@/components/game/ColorSelectPanel";
import { InteractionPrompt } from "@/components/interactions/InteractionPrompt";
import { WritingOverlay } from "@/components/writing/WritingOverlay";
import { LANTERN_COLORS } from "@/constants/lanternColors";
import { useGameStore } from "@/stores/gameStore";
import type { LanternStatus, PlayerState } from "@/types/game";

const IS_DEV = process.env.NODE_ENV === "development";

const STATUS_TEXT: Record<LanternStatus, string> = {
  NONE: "탁자에서 천등을 받아 보세요",
  BLANK: "빈 천등 · 탁자에서 소원을 적어 주세요",
  WRITTEN: "소원을 적은 천등",
  LIT: "불을 붙인 천등",
};

interface GameHUDProps {
  playerRef: RefObject<PlayerState>;
  promptAnchorRef: RefObject<HTMLDivElement | null>;
  paperOverlayRef: RefObject<HTMLDivElement | null>;
}

/** 3D Canvas 위에 겹치는 HTML UI. 모드별로 필요한 패널만 마운트한다 (모드 = store 하나) */
export function GameHUD({ playerRef, promptAnchorRef, paperOverlayRef }: GameHUDProps) {
  const mode = useGameStore((state) => state.mode);
  const status = useGameStore((state) => state.held.status);
  const colorId = useGameStore((state) => state.held.colorId);
  const color = LANTERN_COLORS.find((candidate) => candidate.id === colorId);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <InteractionPrompt playerRef={playerRef} anchorRef={promptAnchorRef} />

      {mode !== "WRITING" && (
        <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-sm text-white backdrop-blur-sm">
          {status !== "NONE" && color && (
            <span
              className="h-3.5 w-2.5 rounded-sm ring-1 ring-white/60"
              style={{ backgroundColor: color.hex }}
              aria-label={`${color.name} 천등`}
            />
          )}
          {STATUS_TEXT[status]}
        </div>
      )}

      {mode === "EXPLORE" && (
        <p className="absolute bottom-4 left-4 rounded bg-black/50 px-3 py-1.5 text-sm text-white">
          WASD / 방향키로 이동 · 탁자를 바라보고 E
          {IS_DEV && (
            <span className="ml-2 text-xs text-white/70">(개발: ` 키로 충돌 영역 표시)</span>
          )}
        </p>
      )}

      {mode === "COLOR_SELECT" && (
        <div className="pointer-events-auto">
          <ColorSelectPanel />
        </div>
      )}
      {mode === "WRITING" && (
        <div className="pointer-events-auto absolute inset-0">
          <WritingOverlay paperOverlayRef={paperOverlayRef} />
        </div>
      )}
    </div>
  );
}
