"use client";

import { useRef } from "react";
import type { RefObject } from "react";

import { useFrame } from "@react-three/fiber";

interface MemoryProbeProps {
  targetRef: RefObject<HTMLSpanElement | null>;
}

/**
 * 개발용 renderer.info.memory 표시 (1단계 랩에서 만들어 4단계 게임에서도 쓴다).
 * 값이 바뀔 때만 DOM textContent를 직접 갱신한다. React state로 매 프레임 렌더링하지 않기 위해서다.
 */
export function MemoryProbe({ targetRef }: MemoryProbeProps) {
  const lastTextRef = useRef("");

  useFrame(({ gl }) => {
    const target = targetRef.current;
    if (!target) return;
    const { textures, geometries } = gl.info.memory;
    const text = `textures ${textures} · geometries ${geometries}`;
    if (text === lastTextRef.current) return;
    lastTextRef.current = text;
    target.textContent = text;
  });

  return null;
}
