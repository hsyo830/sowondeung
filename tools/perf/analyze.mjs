import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(process.argv[2], "utf8"));
const marks = Object.fromEntries(d.marks.map(([n, t]) => [n, t]));
console.log("marks", Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, Math.round(v)])));
const windows = [];
for (const n of [1, 2])
  if (marks[`launch${n}:hold`])
    windows.push([`launch${n}`, marks[`launch${n}:hold`], marks[`launch${n}:end`] ?? Infinity]);
// 로딩 직후 기준 구간: 첫 발사 전 5초
if (marks["launch1:hold"])
  windows.unshift(["before(-5s)", marks["launch1:hold"] - 5000, marks["launch1:hold"]]);
for (const [name, a, b] of windows) {
  const f = d.frames.filter((t) => t >= a && t <= b);
  const gaps = f.slice(1).map((t, i) => t - f[i]);
  const sorted = [...gaps].sort((x, y) => x - y);
  const p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]?.toFixed(1);
  const big = gaps.map((g, i) => [Math.round(f[i] - a), +g.toFixed(1)]).filter(([, g]) => g > 100);
  const gl = d.gl.filter(([, t]) => t >= a && t <= b);
  const comp = gl.filter((e) => e[0] === "compile");
  const link = gl.filter((e) => e[0] === "link");
  const tex = gl.filter((e) => e[0] === "texImage");
  const pp = gl.filter((e) => e[0] === "programParam" && e[2] > 5);
  const sum = (arr) => arr.reduce((s, e) => s + e[2], 0).toFixed(1);
  const names = {};
  for (const c of comp) names[c[3]] = (names[c[3]] || 0) + 1;
  console.log(
    `\n[${name}] frames ${f.length}, median ${p(0.5)}ms, p95 ${p(0.95)}ms, max ${Math.max(...gaps).toFixed(1)}ms`,
  );
  console.log("  frames >100ms (t from start, gap):", JSON.stringify(big.slice(0, 12)));
  console.log(
    `  compileShader ${comp.length} (${sum(comp)}ms), linkProgram ${link.length} (${sum(link)}ms), slow getProgramParameter ${pp.length} (${sum(pp)}ms), texImage2D ${tex.length} (${sum(tex)}ms)`,
  );
  console.log("  compiled shader names:", JSON.stringify(names));
  console.log(
    "  slow programParam (t, ms):",
    JSON.stringify(pp.slice(0, 10).map((e) => [Math.round(e[1] - a), e[2]])),
  );
  console.log(
    "  texImage (t, ms, size):",
    JSON.stringify(tex.slice(0, 10).map((e) => [Math.round(e[1] - a), e[2], e[3]])),
  );
  const slow = gl.filter((e) => e[0] === "slowDraw");
  console.log(
    "  slow draws (t, ms, program):",
    JSON.stringify(slow.slice(0, 12).map((e) => [Math.round(e[1] - a), e[2], e[3]])),
  );
  const progs = (d.programs || []).filter(([t]) => t >= a && t <= b);
  console.log(
    "  new programs (t, kind):",
    JSON.stringify(progs.map(([t, k]) => [Math.round(t - a), k])),
  );
  const lt = d.longtasks.filter(([t]) => t >= a && t <= b);
  console.log("  longtasks (t, ms):", JSON.stringify(lt.map(([t, du]) => [Math.round(t - a), du])));
}
const all = d.gl.filter((e) => e[0] === "compile");
console.log("\ntotal compileShader in session:", all.length);
