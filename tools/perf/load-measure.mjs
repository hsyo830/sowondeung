// 최초 로딩 시간 측정 (perf-launch.mjs와 같은 WebGL 계측·화면 크기). 사용: node load-measure.mjs <out.json> <port> <cold|warm> <회수>
import { readFileSync, writeFileSync } from "node:fs";
const [, , OUT, PORT, MODE, COUNT = "5"] = process.argv;
const perfSrc = readFileSync(new URL("./perf-launch.mjs", import.meta.url), "utf8");
const inject = /addScriptToEvaluateOnNewDocument", \{ source: `([\s\S]*?)` \}\);/.exec(perfSrc)[1];
const stateObserver = `
  window.__load = { log: [] };
  const st = () => { const ov = document.querySelector('.loading-backdrop'); if (!ov) return 'gone'; if (document.querySelector('[role=alert]')) return 'failed'; return ov.getAttribute('aria-hidden') === 'true' ? 'fading' : 'loading'; };
  new MutationObserver(() => { const s = st(); if (s !== window.__load.st) { window.__load.st = s; window.__load.log.push([s, performance.now()]); } }).observe(document, { subtree: true, childList: true, attributes: true });
`;
let targets;
for (let i = 0; i < 60; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 250));
  }
}
const page = targets.find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) =>
  new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evalJs = async (expression) =>
  (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send("Page.enable");
await send("Network.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 640,
  height: 360,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.addScriptToEvaluateOnNewDocument", { source: inject + stateObserver });
const version = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json()).Browser;
const results = [];
for (let i = 0; i < Number(COUNT); i++) {
  if (MODE === "cold") {
    await send("Network.clearBrowserCache");
  }
  await send("Page.navigate", { url: "http://127.0.0.1:3100/" });
  const end = Date.now() + 120000;
  while (Date.now() < end && (await evalJs("window.__load && window.__load.st")) !== "gone")
    await sleep(100);
  await sleep(1500);
  const r =
    await evalJs(`(() => { const L = Object.fromEntries(window.__load.log.map(([s, t]) => [s, t])); const P = window.__perf;
    const ready = L.fading; const glb = performance.getEntriesByType('resource').filter(e => e.name.endsWith('.glb')).map(e => e.responseEnd);
    const nav = performance.getEntriesByType('navigation')[0];
    return { ready: Math.round(ready), gone: Math.round(L.gone), glbDone: Math.round(Math.max(...glb)), domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      programsUntilReady: (P.programs || []).filter(([t]) => t <= ready).length,
      longTasksUntilReady: P.longtasks.filter(([t]) => t <= ready).map(([, d]) => d), texUntilReady: P.gl.filter(e => e[0] === 'texImage' && e[1] <= ready).length }; })()`);
  results.push(r);
  console.log(MODE, i + 1, JSON.stringify(r));
}
writeFileSync(OUT, JSON.stringify({ version, mode: MODE, results }, null, 1));
ws.close();
process.exit(0);
