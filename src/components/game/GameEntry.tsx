"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

import { DesktopOnlyNotice } from "@/components/game/DesktopOnlyNotice";
import { GameErrorBoundary } from "@/components/game/GameErrorBoundary";
import { LoadingScreen } from "@/components/game/LoadingScreen";
import { useGameLoadingStore } from "@/stores/gameLoadingStore";

// WebGL은 서버에서 렌더링할 수 없다. ssr: false는 Client Component에서만 쓸 수 있다 (Next 문서 lazy-loading.md).
// 렌더링할 때만 청크를 받으므로, 모바일에서는 three·R3F 번들을 내려받지 않는다.
// 청크를 받는 동안에도 로딩 화면은 GameEntry가 위에 계속 그리므로 여기서는 아무것도 그리지 않는다.
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => null,
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

/**
 * 게임 진입. 데스크톱이면 3D를 불러오고, 아니면 안내 화면만 보여 준다.
 * matchMedia는 외부 상태라 useSyncExternalStore로 읽는다 (effect 안 setState 없이 변경도 구독한다).
 *
 * 최초 로딩 화면은 게임 **위에** 겹쳐 그린다. 그동안 뒤에서 3D 청크·GLB를 받고 첫 렌더까지 끝낸다.
 * - 프리렌더 HTML에도 로딩 화면이 들어가 첫 화면부터 보인다 (판별 전 null 단계와 같은 위치라 다시 마운트되지 않는다)
 * - 준비 전에는 게임 영역을 inert로 둬 클릭·Tab 포커스를 막는다. 키 입력은 isGameInputBlocked()가 막는다
 * - 준비 완료(GameReadyProbe) → 로딩 화면 페이드아웃. 실패(GameErrorBoundary·바닥 격자 없음) → 안내·다시 시도
 */
export function GameEntry() {
  const isDesktop = useSyncExternalStore<boolean | null>(
    subscribeDesktopQuery,
    getIsDesktop,
    getServerIsDesktop,
  );

  const loadingStatus = useGameLoadingStore((state) => state.status);
  const isGameReady = loadingStatus === "ready";

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#140d1c]">
      {isDesktop === true && (
        <GameErrorBoundary>
          <div className="h-full w-full" inert={!isGameReady}>
            <GameCanvas />
          </div>
        </GameErrorBoundary>
      )}
      {isDesktop === false && <DesktopOnlyNotice />}
      {/* 판별 전(null)에도 같은 자리에 그린다. 데스크톱이 아니면 3D를 받지 않으므로 로딩 화면도 없다 */}
      {isDesktop !== false && (
        <LoadingScreen status={isDesktop === null ? "loading" : loadingStatus} />
      )}
    </main>
  );
}
