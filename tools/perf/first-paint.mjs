// 최초 접속 시 로딩 화면이 처음 그려지는 시점과 Glass 투과 사전 준비가 실행되는 시점을 같은 페이지 시각으로 기록한다.
// 사용: node first-paint.mjs <out.json> <devtools 포트> <url> <회수> [cold|warm]
// - cold: 회차마다 브라우저 캐시를 비운다. warm: 첫 회 뒤 캐시를 그대로 쓴다 (새로고침과 같음)
// - 페이지 시각(ms, navigationStart = 0). 서버 응답 대기(개발 모드 컴파일 포함)는 htmlFirstByte에 들어간다
// - Glass 사전 준비 시각 = 화면 크기 렌더 타깃 할당(texImage2D, 뷰포트 크기) 또는 첫 Glass 셰이더 링크 중 이른 것
import { readFileSync, writeFileSync } from "node:fs";
const [, , OUT, PORT, URL_, COUNT = "1", MODE = "cold"] = process.argv;
const perfSrc = readFileSync(new URL("./perf-launch.mjs", import.meta.url), "utf8");
const injectMatch = /addScriptToEvaluateOnNewDocument", \{\s*source: `([\s\S]*?)`,?\s*\}\);/.exec(
  perfSrc,
);
if (!injectMatch)
  throw new Error("perf-launch.mjs에서 계측 코드(addScriptToEvaluateOnNewDocument)를 찾지 못했다");
const observer = `
  window.__fp = { overlayInDom: null, ready: null, gone: null };
  new MutationObserver(() => {
    const F = window.__fp; const ov = document.querySelector('.loading-backdrop');
    if (ov && F.overlayInDom === null) F.overlayInDom = performance.now();
    if (ov && ov.getAttribute('aria-hidden') === 'true' && F.ready === null) F.ready = performance.now();
    if (!ov && F.overlayInDom !== null && F.gone === null) F.gone = performance.now();
  }).observe(document, { subtree: true, childList: true, attributes: true });
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
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
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
await send("Page.addScriptToEvaluateOnNewDocument", { source: injectMatch[1] + observer });
const results = [];
for (let i = 0; i < Number(COUNT); i++) {
  if (MODE === "cold") await send("Network.clearBrowserCache");
  await send("Page.navigate", { url: URL_ });
  const end = Date.now() + 180000;
  while (Date.now() < end && !(await evalJs("window.__fp && window.__fp.gone"))) await sleep(100);
  await sleep(300);
  const r = await evalJs(`(() => {
    const F = window.__fp, P = window.__perf, nav = performance.getEntriesByType('navigation')[0];
    const paint = Object.fromEntries(performance.getEntriesByType('paint').map((e) => [e.name, e.startTime]));
    const vw = innerWidth + 'x' + innerHeight;
    const rt = P.gl.find((e) => e[0] === 'texImage' && e[3] === vw);
    const glass = P.programs.find((p) => p[2].includes('SHADER_NAME Glass'));
    const warm = [rt && rt[1], glass && glass[0]].filter((x) => x != null);
    const r = (x) => (x == null ? null : Math.round(x));
    return { htmlFirstByte: r(nav.responseStart), firstPaint: r(paint['first-paint']), fcp: r(paint['first-contentful-paint']),
      overlayInDom: r(F.overlayInDom), domContentLoaded: r(nav.domContentLoadedEventEnd), glassWarmup: warm.length ? Math.min(...warm) : null,
      ready: r(F.ready), gone: r(F.gone) };
  })()`);
  results.push(r);
  console.log(MODE, i + 1, JSON.stringify(r));
}
writeFileSync(OUT, JSON.stringify({ url: URL_, mode: MODE, results }, null, 1));
ws.close();
process.exit(0);
