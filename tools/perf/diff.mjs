import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(process.argv[2], "utf8"));
const m = Object.fromEntries(d.marks);
const h = m["launch1:holdDone"];
const early = d.programs.filter(([t]) => t < m["launch1:hold"]);
const l1 = d.programs.filter(([t]) => t >= m["launch1:hold"] && t < m["launch1:end"]);
const l2 = d.programs.filter(
  ([t]) => m["launch2:hold"] && t >= m["launch2:hold"] && t < m["launch2:end"],
);
console.log("programs before", early.length, "| launch1", l1.length, "| launch2", l2.length);
for (const [t, type, defs] of l1) {
  let best = null;
  for (const p of early.filter((p) => p[1] === type)) {
    const a = new Set(p[2]),
      b = new Set(defs);
    const add = [...b].filter((x) => !a.has(x)),
      rem = [...a].filter((x) => !b.has(x));
    if (!best || add.length + rem.length < best.add.length + best.rem.length) best = { add, rem };
  }
  console.log(
    `+${t - h}ms ${type}`,
    best
      ? `vs 가장 비슷한 기존: +[${best.add.join(" | ")}] -[${best.rem.join(" | ")}]`
      : "(같은 재질 종류가 처음)",
  );
}
console.log(
  "longtasks (holdDone 기준)",
  JSON.stringify(
    d.longtasks.filter(([t]) => t >= m["launch1:hold"]).map(([t, du]) => [Math.round(t - h), du]),
  ),
);
