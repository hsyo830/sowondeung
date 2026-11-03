// 발사 측정 기록(perf-launch.mjs 결과)에서 기준 수치를 뽑는다.
import { readFileSync } from "node:fs";
const pct = (arr, q) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
};
for (const file of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const m = Object.fromEntries(d.marks);
  console.log(`\n=== ${file.split("/").pop()} ===`);
  // 평소 프레임: 첫 발사 직전 5초 (점화 순간 포함 가능 → 별도 표시)
  for (const n of [1, 2]) {
    const a = m[`launch${n}:hold`],
      h = m[`launch${n}:holdDone`],
      b = m[`launch${n}:end`];
    if (!a) continue;
    const f = d.frames.filter((t) => t >= a && t <= b);
    const gaps = f.slice(1).map((t, i) => t - f[i]);
    const maxI = gaps.indexOf(Math.max(...gaps));
    const lt = d.longtasks.filter(([t]) => t >= a && t <= b);
    const progs = (d.programs || []).filter(([t]) => t >= a && t <= b);
    const tex = d.gl.filter((e) => e[0] === "texImage" && e[1] >= a && e[1] <= b);
    const glass = progs.filter((p) => (p[2] || []).some((x) => x === "SHADER_NAME Glass"));
    const noTone = progs.filter(
      (p) =>
        p[2] &&
        !p[2].includes("TONE_MAPPING") &&
        !(p[2] || []).includes("SHADER_NAME Glass") &&
        p[0] - h > 4000,
    );
    console.log(
      `launch${n}: frames ${f.length}, median ${pct(gaps, 0.5).toFixed(1)}ms, p95 ${pct(gaps, 0.95).toFixed(1)}ms, max ${gaps[maxI].toFixed(1)}ms @ +${Math.round(f[maxI] - h)}ms(홀드 완료 기준)`,
    );
    console.log(`  longtasks: ${JSON.stringify(lt.map(([t, du]) => [Math.round(t - h), du]))}`);
    console.log(
      `  programs linked: ${progs.length} | Glass: ${glass.length} | 톤매핑 없는 변형(+4s 이후): ${noTone.length}`,
    );
    console.log(`  program link times: ${JSON.stringify(progs.map((p) => Math.round(p[0] - h)))}`);
    console.log(
      `  texImage2D: ${JSON.stringify(tex.map((e) => [Math.round(e[1] - h), e[3], e[2] + "ms"]))}`,
    );
    const linkCalls = d.gl.filter((e) => e[0] === "link" && e[1] >= a && e[1] <= b);
    console.log(
      `  linkProgram 호출 자체 합계: ${linkCalls.reduce((s, e) => s + e[2], 0).toFixed(2)}ms (${linkCalls.length}회)`,
    );
  }
  const pre = d.frames.filter((t) => t >= m["launch1:hold"] - 5000 && t < m["launch1:hold"]);
  const g = pre.slice(1).map((t, i) => t - pre[i]);
  console.log(
    `평소(첫 발사 전 5초): median ${pct(g, 0.5).toFixed(1)}ms, p95 ${pct(g, 0.95).toFixed(1)}ms`,
  );
}
