import { describe, expect, it } from "vitest";

import { getGameReadiness } from "./gameReadiness";

describe("게임 준비 판정 (최초 로딩 화면)", () => {
  it("GLB가 들어간 뒤 아직 한 번도 그리지 않았으면 기다린다 (바닥 격자가 있어도)", () => {
    expect(getGameReadiness({ renderedFrames: 0, hasTerrain: true })).toBe("pending");
    expect(getGameReadiness({ renderedFrames: 0, hasTerrain: false })).toBe("pending");
  });

  it("한 번 그린 뒤 바닥 격자가 있으면 준비 완료", () => {
    expect(getGameReadiness({ renderedFrames: 1, hasTerrain: true })).toBe("ready");
    expect(getGameReadiness({ renderedFrames: 5, hasTerrain: true })).toBe("ready");
  });

  it("한 번 그린 뒤에도 바닥 격자가 없으면 실패 (이동·충돌 판정을 할 수 없다)", () => {
    expect(getGameReadiness({ renderedFrames: 1, hasTerrain: false })).toBe("failed");
  });
});
