"use client";

import { useId, useLayoutEffect, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

import { CloseIcon, CornerFlourish } from "./MenuIcons";

interface GameDialogProps {
  title: ReactNode;
  /** 제목 위 원형 장식 안에 들어갈 그림 */
  medallion: ReactNode;
  onClose: () => void;
  /** 패널 너비 (완전한 Tailwind 클래스 문자열) */
  widthClassName: string;
  children: ReactNode;
  /** 패널 맨 아래 장식 (스크롤 영역 밖, 둥근 모서리에 맞춰 잘린다) */
  footer?: ReactNode;
}

/**
 * 크림색·금색 모달 틀. 브라우저 기본 <dialog>를 showModal()로 연다.
 * - 바깥은 inert가 되어 Canvas·HUD를 클릭할 수 없고, Tab 포커스가 창 안에서만 돈다 (포커스 가두기).
 * - ESC: 브라우저가 창을 닫고 close 이벤트를 보낸다 → onClose. 닫기 버튼·바깥(어두운 배경) 클릭도 onClose.
 * - 열린 상태의 원본은 menuStore다. 이 컴포넌트는 마운트 = 열기, 언마운트 = 닫기만 한다.
 * - 닫을 때 열기 전 포커스로 돌려놓는다 (키보드로 연 경우 그 버튼으로 돌아간다).
 * 게임 키 입력은 이 창이 막는 것이 아니라, 각 입력 처리부가 isGameInputBlocked()로 무시한다.
 */
export function GameDialog({
  title,
  medallion,
  onClose,
  widthClassName,
  children,
  footer,
}: GameDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    // 패널 바깥(::backdrop 또는 dialog 자신의 빈 영역)을 누른 경우만 닫는다
    if (event.target === event.currentTarget) onClose();
  }

  function handleNativeClose() {
    // close 이벤트는 close() 직후가 아니라 다음 작업에서 온다. 개발 모드 StrictMode는 effect를
    // 실행 → 정리(close) → 다시 실행(showModal)하므로, 정리 때 생긴 close 이벤트가 다시 열린 뒤에 도착한다.
    // 그때 창은 열려 있으니 무시한다. ESC로 실제로 닫혔으면 open이 false다.
    if (dialogRef.current?.open) return;
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleNativeClose}
      onClick={handleClick}
      className={`pointer-events-auto m-auto max-h-none max-w-none overflow-visible bg-transparent p-0 pt-8 text-[#4a2f1a] opacity-100 transition-[opacity,translate] duration-200 backdrop:bg-[#140d1c]/55 backdrop:backdrop-blur-[2px] motion-reduce:transition-none starting:translate-y-2 starting:opacity-0 ${widthClassName}`}
    >
      <div className="relative flex max-h-[calc(100dvh-4rem)] flex-col rounded-[1.75rem] border-2 border-[#d9b26f] bg-linear-to-b from-[#fffaf0] to-[#f7ead0] shadow-[0_12px_36px_rgba(20,13,28,0.4)]">
        {/* 안쪽 얇은 금색 선과 네 모서리 장식 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-1.5 rounded-[1.4rem] border border-[#e8cf9c]"
        />
        <CornerFlourish className="pointer-events-none absolute top-3 left-3 h-5 w-5 text-[#d9b26f]" />
        <CornerFlourish className="pointer-events-none absolute top-3 right-3 h-5 w-5 -scale-x-100 text-[#d9b26f]" />
        <CornerFlourish className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 -scale-y-100 text-[#d9b26f]" />
        <CornerFlourish className="pointer-events-none absolute right-3 bottom-3 h-5 w-5 -scale-100 text-[#d9b26f]" />

        {/* 제목 위 원형 장식 (천등 모티브) */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#d9b26f] bg-radial from-[#fff6d8] to-[#f6d08a] shadow-[0_0_18px_rgba(255,196,110,0.55)]"
        >
          {medallion}
        </div>

        <header className="relative shrink-0 px-14 pt-11 pb-3 text-center">
          <h2 id={titleId} className="text-2xl font-bold tracking-tight text-[#4a2f1a]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full border border-[#d9b26f] bg-[#fffaf0] text-[#4a2f1a] transition-colors hover:bg-[#f7e7c6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9853f] active:bg-[#efd9ad]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        {/* 내용이 많거나 화면이 낮으면 이 영역만 스크롤된다 (제목·닫기 버튼은 고정) */}
        <div className="menu-scroll relative min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-7">
          {children}
        </div>
        {footer && (
          <div
            aria-hidden
            className="pointer-events-none shrink-0 overflow-hidden rounded-b-[1.65rem]"
          >
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
