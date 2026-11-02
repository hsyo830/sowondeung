/**
 * 커밋 시 스테이징된 파일에만 실행된다.
 * - TS·TSX·JS: ESLint(--fix) → Prettier
 * - JSON·CSS·Markdown: Prettier만
 * @type {import("lint-staged").Configuration}
 */
const config = {
  "*.{ts,tsx,js,jsx,mjs,cjs}": [
    "eslint --fix --max-warnings=0 --no-warn-ignored",
    "prettier --write --ignore-unknown",
  ],
  "*.{json,css,md}": "prettier --write --ignore-unknown",
};

export default config;
