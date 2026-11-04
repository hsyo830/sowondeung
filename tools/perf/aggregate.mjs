// perf-launch.mjs 결과 여러 개를 모아 발사별 중간값(최소~최대)과 회차별 값을 낸다. 사용: node aggregate.mjs <run.json...>
// 첫 발사 전(로딩·준비 중)에 만든 Glass 셰이더·화면 크기 렌더 타깃 수도 회차별로 보여 준다 (사전 준비 확인용).
import { readFileSync } from "node:fs";
const med = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const st = (a) =>
  a.length
    ? `${+med(a).toFixed(1)} (${+Math.min(...a).toFixed(1)}~${+Math.max(...a).toFixed(1)})`
    : "-";
const rows = { 1: [], 2: [] };
const pre = [];
for (const file of process.argv.slice(2)) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const m = Object.fromEntries(d.marks);
  const ok = m["launch2:end"] ? "" : " (FLOW INCOMPLETE)";
  const before = (d.programs || []).filter(([t]) => t < m["launch1:hold"]);
  pre.push({
    file,
    glassBefore: before.filter((p) => p[2].includes("SHADER_NAME Glass")).length,
    progsBefore: before.length,
    rt: d.gl.filter((e) => e[0] === "texImage" && e[1] < m["launch1:hold"] && e[3] === "640x360")
      .length,
    ok,
  });
  for (const n of [1, 2]) {
    const a = m[`launch${n}:hold`],
      b = m[`launch${n}:end`];
    if (!a || !b) continue;
    const f = d.frames.filter((t) => t >= a && t <= b);
    const g = f.slice(1).map((t, i) => t - f[i]);
    const s = [...g].sort((x, y) => x - y);
    const lt = d.longtasks.filter(([t]) => t >= a && t <= b).map(([, x]) => x);
    const pr = (d.programs || []).filter(([t]) => t >= a && t <= b);
    rows[n].push({
      max: Math.max(...g),
      p95: s[Math.floor(s.length * 0.95)],
      med: s[Math.floor(s.length * 0.5)],
      lt,
      ltN: lt.length,
      ltSum: lt.reduce((x, y) => x + y, 0),
      ltMax: Math.max(0, ...lt),
      progs: pr.length,
      glass: pr.filter((p) => p[2].includes("SHADER_NAME Glass")).length,
      rt: d.gl.filter((e) => e[0] === "texImage" && e[1] >= a && e[1] <= b && e[3] === "640x360")
        .length,
    });
  }
}
for (const p of pre)
  console.log(
    p.file.split(/[\/]/).pop(),
    "before launch1: programs",
    p.progsBefore,
    "glass",
    p.glassBefore,
    "RT640x360",
    p.rt,
    p.ok,
  );
for (const n of [1, 2]) {
  const r = rows[n];
  console.log(`\nlaunch${n} n=${r.length}`);
  for (const k of ["max", "p95", "med", "ltN", "ltSum", "ltMax", "progs", "glass", "rt"])
    console.log(
      `  ${k.padEnd(6)} ${st(r.map((x) => x[k]))}   per-run: ${r.map((x) => +x[k].toFixed(1)).join(", ")}`,
    );
  console.log("  longtasks per run:", JSON.stringify(r.map((x) => x.lt)));
}
