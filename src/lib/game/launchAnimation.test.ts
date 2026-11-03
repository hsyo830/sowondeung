import { describe, expect, it } from "vitest";

import { LAUNCH_ANIMATION } from "@/constants/animation";

import { getNextLaunchPhase, shouldReleaseLantern } from "./launchAnimation";
import type { LaunchAnimationEvent, LaunchAnimationPhase } from "./launchAnimation";

const PHASES: LaunchAnimationPhase[] = ["NONE", "THROW", "PRAY"];
const EVENTS: LaunchAnimationEvent[] = ["start", "throwFinished", "prayFinished"];

describe("getNextLaunchPhase — 발사 동작 순서", () => {
  it("전이 표: start NONE→THROW, throwFinished THROW→PRAY, prayFinished PRAY→NONE, 나머지는 무시", () => {
    const allowed: Record<string, LaunchAnimationPhase> = {
      "NONE/start": "THROW",
      "THROW/throwFinished": "PRAY",
      "PRAY/prayFinished": "NONE",
    };
    for (const phase of PHASES) {
      for (const event of EVENTS) {
        expect(getNextLaunchPhase(phase, event), `${phase}/${event}`).toBe(
          allowed[`${phase}/${event}`] ?? null,
        );
      }
    }
  });

  it("한 번의 발사는 Throw → Praying → Idle 순서로 한 바퀴 돌고, 반복해도 같은 순서다", () => {
    let phase: LaunchAnimationPhase = "NONE";
    const visited: LaunchAnimationPhase[] = [];
    for (let round = 0; round < 3; round++) {
      for (const event of EVENTS) {
        const next = getNextLaunchPhase(phase, event);
        expect(next).not.toBeNull();
        phase = next as LaunchAnimationPhase;
        visited.push(phase);
      }
    }
    expect(visited).toEqual([
      "THROW",
      "PRAY",
      "NONE",
      "THROW",
      "PRAY",
      "NONE",
      "THROW",
      "PRAY",
      "NONE",
    ]);
  });

  it("발사 모드인 동안 매 프레임 start가 와도 재생 중에는 다시 시작하지 않는다", () => {
    expect(getNextLaunchPhase("THROW", "start")).toBeNull();
    expect(getNextLaunchPhase("PRAY", "start")).toBeNull();
  });

  it("finished가 중복으로 와도 두 번째는 무시된다", () => {
    const afterThrow = getNextLaunchPhase("THROW", "throwFinished");
    expect(afterThrow).toBe("PRAY");
    expect(getNextLaunchPhase(afterThrow as LaunchAnimationPhase, "throwFinished")).toBeNull();
  });
});

describe("shouldReleaseLantern — 손을 놓는 시점", () => {
  const RELEASE = LAUNCH_ANIMATION.throwReleaseSec;

  it("놓는 시점 전에는 false, 지나면 true", () => {
    expect(shouldReleaseLantern(RELEASE - 0.01, RELEASE, false)).toBe(false);
    expect(shouldReleaseLantern(RELEASE, RELEASE, false)).toBe(true);
    expect(shouldReleaseLantern(RELEASE + 0.5, RELEASE, false)).toBe(true);
  });

  it("이미 놓았으면 다시 true가 되지 않는다 (발사 인스턴스 중복 생성 방지)", () => {
    expect(shouldReleaseLantern(RELEASE + 0.5, RELEASE, true)).toBe(false);
  });

  it("큰 delta로 놓는 시점을 건너뛰어 클립 끝(클램프된 시간)에 와도 한 번은 놓는다", () => {
    const clipEndSec = 5.767;
    expect(shouldReleaseLantern(clipEndSec, RELEASE, false)).toBe(true);
  });

  it("설정: 건너뛰는 앞부분 뒤에 놓고, 홀드 완료 후 약 2.1초에 놓는다", () => {
    const { throwStartSec, throwTimeScale } = LAUNCH_ANIMATION;
    expect(RELEASE).toBeGreaterThan(throwStartSec);
    expect((RELEASE - throwStartSec) / throwTimeScale).toBeCloseTo(2.1, 1);
  });
});
