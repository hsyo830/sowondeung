import { describe, expect, it } from "vitest";

import { getGameReadiness } from "./gameReadiness";

describe("게임 준비 판정 (최초 로딩 화면)", () => {
  it("GLB가 들어간 뒤 아직 한 번도 그리지 않았으면 기다린다 (바닥 격자가 있어도)", () => {
    expect(
      getGameReadiness({ renderedFrames: 0, hasTerrain: true, hasAttemptedWarmup: true }),
    ).toBe("pending");
    expect(
      getGameReadiness({ renderedFrames: 0, hasTerrain: false, hasAttemptedWarmup: true }),
    ).toBe("pending");
  });

  it("한 번 그린 뒤 바닥 격자가 있으면 준비 완료", () => {
    expect(
      getGameReadiness({ renderedFrames: 1, hasTerrain: true, hasAttemptedWarmup: true }),
    ).toBe("ready");
    expect(
      getGameReadiness({ renderedFrames: 5, hasTerrain: true, hasAttemptedWarmup: true }),
    ).toBe("ready");
  });

  it("한 번 그린 뒤에도 바닥 격자가 없으면 실패 (이동·충돌 판정을 할 수 없다)", () => {
    expect(
      getGameReadiness({ renderedFrames: 1, hasTerrain: false, hasAttemptedWarmup: true }),
    ).toBe("failed");
  });

  it("투과 렌더링 사전 준비를 아직 시도하지 않았으면 그린 뒤에도 기다린다", () => {
    expect(
      getGameReadiness({ renderedFrames: 1, hasTerrain: true, hasAttemptedWarmup: false }),
    ).toBe("pending");
    expect(
      getGameReadiness({ renderedFrames: 3, hasTerrain: false, hasAttemptedWarmup: false }),
    ).toBe("pending");
  });
});
