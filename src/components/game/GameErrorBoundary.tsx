"use client";

import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { useGameLoadingStore } from "@/stores/gameLoadingStore";

interface GameErrorBoundaryProps {
  children: ReactNode;
}

interface GameErrorBoundaryState {
  hasError: boolean;
}

/**
 * 게임 영역의 오류 경계. 잡는 오류: 3D 청크(next/dynamic) 로딩 실패, GLB 요청·파싱 실패(useLoader가 던진다.
 * R3F Canvas는 안쪽 오류를 Canvas 바깥으로 다시 던진다), WebGL 컨텍스트 생성 실패, 렌더 중 런타임 오류.
 * 오류가 나면 게임 영역을 내리고(빈 화면) 로딩 store를 failed로 바꾼다. 안내·다시 시도는 LoadingScreen이 그린다.
 * 오류 경계는 클래스 컴포넌트로만 만들 수 있다 (React 19).
 */
export class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  state: GameErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GameErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[GameErrorBoundary] 게임을 준비하지 못했다", error, info.componentStack);
    useGameLoadingStore.getState().markFailed();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
