// load-measure.mjs 결과에서 중간값(최소~최대)을 뽑는다. warm 파일은 첫 결과(첫 로드)를 뺀다.
// 사용: node load-stats.mjs <load-cold-1.json ...> 또는 <load-warm.json>
import { readFileSync } from "node:fs";
const rows = [];
for (const file of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  rows.push(...(d.mode === "warm" ? d.results.slice(1) : d.results));
}
const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const stat = (arr) => `${median(arr)} (${Math.min(...arr)}~${Math.max(...arr)})`;
const sum = (arr) => arr.reduce((s, x) => s + x, 0);
console.log(`n = ${rows.length}`);
console.log(`준비 완료(페이드 시작)   ${stat(rows.map((r) => r.ready))}`);
console.log(`로딩 화면 제거           ${stat(rows.map((r) => r.gone))}`);
console.log(`GLB 다운로드 완료        ${stat(rows.map((r) => r.glbDone))}`);
console.log(
  `준비 전 가장 긴 Long Task ${stat(rows.map((r) => Math.max(0, ...r.longTasksUntilReady)))}`,
);
console.log(`준비 전 Long Task 합     ${stat(rows.map((r) => sum(r.longTasksUntilReady)))}`);
console.log(`준비 전 새 셰이더 프로그램 ${stat(rows.map((r) => r.programsUntilReady))}`);
console.log(`준비 전 texImage2D       ${stat(rows.map((r) => r.texUntilReady))}`);
