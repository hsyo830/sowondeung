import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { AUDIO_FILES, ONE_SHOT_CONFIG } from "./audio";

// 경로가 틀리면 엔진은 그 소리만 조용히 건너뛴다 (오류 없음). 그래서 파일이 실제로 있는지 여기서 확인한다.
const PUBLIC_DIR = fileURLToPath(new URL("../../public", import.meta.url));

describe("오디오 파일 경로", () => {
  it("경로가 있는 소리는 public 아래에 실제 파일이 있다", () => {
    for (const [id, path] of Object.entries(AUDIO_FILES)) {
      if (path === null) continue;
      expect(existsSync(`${PUBLIC_DIR}${path}`), `${id}: ${path}`).toBe(true);
    }
  });

  it("점화·발사 효과음이 연결되어 있다", () => {
    expect(AUDIO_FILES.ignite).toBe("/audio/ignite.mp3");
    expect(AUDIO_FILES.launch).toBe("/audio/launch.mp3");
  });
});

describe("1회 효과음 설정", () => {
  it("세기는 0보다 크고 1 이하, 시작 위치·cooldown은 0 이상이다", () => {
    for (const config of Object.values(ONE_SHOT_CONFIG)) {
      expect(config.gain).toBeGreaterThan(0);
      expect(config.gain).toBeLessThanOrEqual(1);
      expect(config.offsetSec).toBeGreaterThanOrEqual(0);
      expect(config.cooldownMs).toBeGreaterThanOrEqual(0);
    }
  });
});
