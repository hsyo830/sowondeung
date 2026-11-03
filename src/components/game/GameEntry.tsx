"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

import { DesktopOnlyNotice } from "@/components/game/DesktopOnlyNotice";

// WebGL은 서버에서 렌더링할 수 없다. ssr: false는 Client Component에서만 쓸 수 있다 (Next 문서 lazy-loading.md).
// 렌더링할 때만 청크를 받으므로, 모바일에서는 three·R3F 번들을 내려받지 않는다.
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

/** SPEC §4 [결정] 마우스·트랙패드가 하나라도 있으면 데스크톱으로 본다. User-Agent는 쓰지 않는다 */
const DESKTOP_QUERY = "(any-pointer: fine)";

function subscribeDesktopQuery(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getIsDesktop() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

/** 서버(프리렌더)에서는 판별할 수 없다. null = 아직 모름 → 로딩 화면 */
function getServerIsDesktop() {
  return null;
}

function LoadingScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-sm text-zinc-400">
      불러오는 중…
    </div>
  );
}

/**
 * 게임 진입. 데스크톱이면 3D를 불러오고, 아니면 안내 화면만 보여 준다.
 * matchMedia는 외부 상태라 useSyncExternalStore로 읽는다 (effect 안 setState 없이 변경도 구독한다).
 */
export function GameEntry() {
  const isDesktop = useSyncExternalStore<boolean | null>(
    subscribeDesktopQuery,
    getIsDesktop,
    getServerIsDesktop,
  );

  return (
    <main className="h-dvh w-full overflow-hidden">
      {isDesktop === null && <LoadingScreen />}
      {isDesktop === true && <GameCanvas />}
      {isDesktop === false && <DesktopOnlyNotice />}
    </main>
  );
}
