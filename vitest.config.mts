import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// SPEC §2: Vitest는 순수 함수 테스트 전용 (node 환경, jsdom 없음)
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
