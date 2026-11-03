"use client";

import { useEffect, useRef, useState } from "react";
import type { TransitionEvent } from "react";

import type { GameLoadingStatus } from "@/stores/gameLoadingStore";

interface LoadingScreenProps {
  status: GameLoadingStatus;
}

/**
 * 최초 접속 로딩 화면 (게임 위를 덮는 오버레이). 이미지·3D 에셋 없이 CSS·인라인 SVG만 쓴다.
 * - loading: 진행률을 믿을 수 있는 값이 없어(GLB 안 텍스처 수가 로딩 중에 늘고, 3D 청크 다운로드는 집계되지 않는다)
 *   퍼센트 대신 오가는 막대로 진행 중임만 보여 준다.
 * - ready: 그 자리에서 페이드아웃하고(뒤의 게임은 이미 한 번 그려진 상태), 끝나면 DOM에서 뺀다.
 * - failed: 안내와 다시 시도 버튼. 다시 시도는 페이지를 새로 불러온다 (실패한 청크·로더 캐시와 게임 상태를 모두 비운다).
 * 애니메이션은 transform·opacity만 쓰고, 움직임 줄이기 설정에서는 멈춘다 (globals.css `.loading-*`).
 */
export function LoadingScreen({ status }: LoadingScreenProps) {
  const [hasFadedOut, setHasFadedOut] = useState(false);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const isReady = status === "ready";
  const isFailed = status === "failed";

  useEffect(() => {
    // 실패 안내가 뜨면 키보드 사용자가 바로 다시 시도할 수 있게 버튼으로 포커스를 옮긴다
    if (isFailed) retryButtonRef.current?.focus();
  }, [isFailed]);

  function handleTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && event.propertyName === "opacity" && isReady) {
      setHasFadedOut(true);
    }
  }

  if (hasFadedOut) return null;

  return (
    <div
      aria-hidden={isReady}
      onTransitionEnd={handleTransitionEnd}
      className={`loading-backdrop absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center transition-[opacity,visibility] duration-500 ease-out motion-reduce:duration-200 ${
        isReady ? "pointer-events-none invisible opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative mb-6 flex flex-col items-center" aria-hidden>
        <div className={isFailed ? "opacity-60 grayscale-[0.4]" : "loading-float"}>
          <LoadingLantern />
        </div>
        <div
          className={`mt-2 h-2 w-16 rounded-[50%] bg-black/35 ${isFailed ? "" : "loading-shadow"}`}
        />
      </div>

      <h1 className="text-3xl font-bold tracking-wide text-[#fdf3dc] sm:text-4xl">소원등</h1>

      {isFailed ? (
        <div role="alert" className="mt-4 flex flex-col items-center">
          <p className="text-base text-[#f3e6d2]">숲을 불러오지 못했어요.</p>
          <p className="mt-1 text-sm leading-6 text-[#d6c8de]/80">
            네트워크 연결을 확인한 뒤 다시 시도해 주세요.
          </p>
          <button
            ref={retryButtonRef}
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full border border-[#d9b26f] bg-linear-to-b from-[#fffaf0] to-[#f2deb4] px-6 py-2 text-sm font-semibold text-[#4a2f1a] shadow-[0_4px_14px_rgba(20,13,28,0.45)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0c06a] motion-reduce:transition-none"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-[#e9dcc9]/85 sm:text-base">마음을 담아, 하늘로 날려요</p>
          <div
            role="progressbar"
            aria-label="게임 준비 중"
            className="mt-7 h-1 w-48 overflow-hidden rounded-full bg-white/12 sm:w-56"
          >
            <span className="loading-sweep block h-full w-2/5 rounded-full bg-linear-to-r from-[#d9963f] to-[#f0c06a]" />
          </div>
          <p role="status" className="mt-4 text-xs text-[#cdbfd8]/75 sm:text-sm">
            숲속의 밤을 준비하고 있어요...
          </p>
        </>
      )}
    </div>
  );
}

/** 작은 천등 (위가 넓은 종이 + 아래 불빛 + 주변 작은 불티). 장식이라 aria-hidden */
function LoadingLantern() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 sm:h-20 sm:w-20" aria-hidden>
      <defs>
        <radialGradient id="loading-lantern-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="loading-lantern-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6d6a6" />
          <stop offset="1" stopColor="#e9a35a" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="34" r="26" fill="url(#loading-lantern-glow)" />
      <path
        d="M20 14 H44 L40 46 H24 Z"
        fill="url(#loading-lantern-paper)"
        stroke="#a8692d"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M21 14 C25 18 39 18 43 14" fill="#fff1d6" opacity="0.7" />
      <ellipse cx="32" cy="30" rx="6" ry="7" fill="#fff6e0" opacity="0.55" />
      <rect x="25" y="46" width="14" height="2.6" rx="1.1" fill="#a8692d" />
      <ellipse cx="32" cy="43" rx="3" ry="2" fill="#fff3b0" />
      <circle cx="51" cy="12" r="1" fill="#f6d6a6" opacity="0.8" />
      <circle cx="10" cy="26" r="0.8" fill="#f6d6a6" opacity="0.6" />
      <circle cx="54" cy="40" r="0.7" fill="#f6d6a6" opacity="0.5" />
    </svg>
  );
}
