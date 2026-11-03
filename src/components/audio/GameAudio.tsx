"use client";

import { useEffect } from "react";

import { getAudioEngine } from "@/lib/audio/audioEngine";
import { getGameSoundEvents } from "@/lib/audio/soundRules";
import { useAudioSettingsStore } from "@/stores/audioSettingsStore";
import { useGameStore } from "@/stores/gameStore";

/** 이 속성이 붙은 버튼(과 그 안)은 클릭 효과음을 내지 않는다 (예: 홀드 버튼은 떼는 순간 click이 생긴다) */
const SFX_OFF_SELECTOR = '[data-sfx="off"]';

/**
 * 오디오 연결부 (화면에 아무것도 그리지 않는다). 소리는 오디오 엔진(모듈 싱글턴)이 내고, 여기는 언제 낼지만 잇는다.
 * - 자동 재생 정책: 첫 클릭·키 입력 때 unlock. 리스너는 capture·passive라 게임 입력을 막거나 바꾸지 않는다.
 * - 소리 설정 store → 엔진 볼륨 (구독, 렌더 없음)
 * - 게임 store의 상태 전이 → 효과음 (getGameSoundEvents). 게임 로직은 오디오를 모른다.
 * - 버튼 클릭 효과음: 문서 전체 click 하나로 처리한다 (버튼마다 핸들러를 달지 않는다).
 * 리스너는 이 effect 하나에서만 달고 정리 함수에서 모두 뗀다 (StrictMode 재마운트에도 중복되지 않는다).
 */
export function GameAudio() {
  useEffect(() => {
    const engine = getAudioEngine();
    void engine.preload();
    engine.applySettings(useAudioSettingsStore.getState().settings);

    const unsubscribeSettings = useAudioSettingsStore.subscribe((state, previous) => {
      if (state.settings !== previous.settings) engine.applySettings(state.settings);
    });
    const unsubscribeGame = useGameStore.subscribe((state, previous) => {
      for (const soundId of getGameSoundEvents(previous, state)) engine.playOneShot(soundId);
    });

    const gestureOptions = { capture: true, passive: true } as const;
    function removeGestureListeners() {
      window.removeEventListener("pointerdown", handleUserGesture, gestureOptions);
      window.removeEventListener("keydown", handleUserGesture, gestureOptions);
    }
    function handleUserGesture() {
      // 완전히 켜질 때까지(컨텍스트 실행 + BGM 재생) 입력마다 다시 시도한다. 켜지면 리스너를 뗀다
      if (engine.unlock()) removeGestureListeners();
    }
    window.addEventListener("pointerdown", handleUserGesture, gestureOptions);
    window.addEventListener("keydown", handleUserGesture, gestureOptions);

    function handleClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button");
      if (!button || button.disabled || button.closest(SFX_OFF_SELECTOR)) return;
      engine.playOneShot("uiClick");
    }
    document.addEventListener("click", handleClick, true);

    return () => {
      unsubscribeSettings();
      unsubscribeGame();
      removeGestureListeners();
      document.removeEventListener("click", handleClick, true);
      engine.shutdown();
    };
  }, []);

  return null;
}
