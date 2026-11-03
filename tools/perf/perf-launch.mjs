// 프로덕션 빌드에서 첫 발사·두 번째 발사의 프레임 간격, WebGL 셰이더 컴파일·텍스처 업로드, Long Task를 기록한다.
import { writeFileSync } from "node:fs";
const [, , OUT, PORT = "9338", LABEL = "run"] = process.argv;
const URL_ = "http://127.0.0.1:3100/";
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
  (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result
    ?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, "base64"));
};
const KEYS = { KeyW: "w", KeyA: "a", KeyS: "s", KeyD: "d", KeyE: "e", KeyF: "f" };
const key = (type, code) =>
  send("Input.dispatchKeyEvent", {
    type,
    code,
    key: KEYS[code],
    windowsVirtualKeyCode: KEYS[code].toUpperCase().charCodeAt(0),
  });
const hold = async (code, ms) => {
  await key("keyDown", code);
  await sleep(ms);
  await key("keyUp", code);
};
async function waitFor(cond, ms = 90000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evalJs(cond)) return true;
    await sleep(100);
  }
  return false;
}
const hasButton = (text) =>
  `Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes(${JSON.stringify(text)}) && b.offsetParent !== null)`;
async function pulseUntil(code, text, max = 40, ms = 120) {
  for (let i = 0; i < max; i++) {
    if (await evalJs(hasButton(text))) return true;
    await hold(code, ms);
    await sleep(120);
  }
  return evalJs(hasButton(text));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 640,
  height: 360,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `
  window.__perf = { frames: [], gl: [], longtasks: [], marks: [] };
  const P = window.__perf;
  const now = () => performance.now();
  (function loop(t) { P.frames.push(t); requestAnimationFrame(loop); })(0);
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) P.longtasks.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ entryTypes: ['longtask'] }); } catch {}
  window.__mark = (name) => P.marks.push([name, now()]);
  const info = new WeakMap(); const progShaders = new WeakMap(); let current = null; P.programs = [];
  for (const Ctx of [WebGL2RenderingContext, WebGLRenderingContext]) {
    const proto = Ctx.prototype;
    const origSource = proto.shaderSource;
    proto.shaderSource = function (shader, src) {
      const isFrag = /gl_FragColor|pc_fragColor|out highp vec4/.test(src);
      const defs = (src.match(/#define [A-Za-z_0-9]+.*/g) || []).map(d => d.slice(8).trim());
      const type = /MeshStandardMaterial|MeshBasicMaterial|MeshPhysicalMaterial|PointsMaterial|MeshLambertMaterial|ShaderMaterial/.exec(src);
      info.set(shader, { frag: isFrag, type: type ? type[0] : '?', defs });
      return origSource.call(this, shader, src);
    };
    const origAttach = proto.attachShader;
    proto.attachShader = function (program, shader) { const list = progShaders.get(program) || []; list.push(shader); progShaders.set(program, list); return origAttach.call(this, program, shader); };
    const origLink = proto.linkProgram;
    proto.linkProgram = function (program) { const t0 = now(); const r = origLink.call(this, program); const sh = (progShaders.get(program) || []).map(s => info.get(s)).filter(Boolean); const f = sh.find(x => x.frag) || sh[sh.length-1] || { type: '?', defs: [] }; P.programs.push([Math.round(t0), f.type, f.defs]); P.gl.push(['link', Math.round(t0), +(now()-t0).toFixed(2), '']); return r; };
    const origUse = proto.useProgram;
    proto.useProgram = function (program) { current = program; return origUse.call(this, program); };
    for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const orig = proto[fn]; if (!orig) continue;
      proto[fn] = function (...args) { const t0 = now(); const r = orig.apply(this, args); const dt = now() - t0; if (dt > 30) P.gl.push(['slowDraw', Math.round(t0), +dt.toFixed(1), 'draw']); return r; };
    }
    const origTex = proto.texImage2D;
    proto.texImage2D = function (...args) { const t0 = now(); const r = origTex.apply(this, args); const dt = now() - t0; const src = args[args.length - 1]; P.gl.push(['texImage', Math.round(t0), +dt.toFixed(2), src && src.width ? src.width + 'x' + src.height : args[3] + 'x' + args[4]]); return r; };
  }
`,
});
await send("Page.navigate", { url: URL_ });
await waitFor("!document.querySelector('.loading-backdrop')");
await sleep(1500);
const log = [];
const mark = async (n) => {
  await evalJs(`window.__mark(${JSON.stringify(n)})`);
  log.push(n);
};

async function prepareLantern(first) {
  // 탁자까지: 처음은 시작 위치에서 W로 내려가고 A로 탁자를 바라본다
  if (first) await hold("KeyW", 1100);
  const atTable =
    (await pulseUntil("KeyA", "소원등 받기", 40)) ||
    (await pulseUntil("KeyW", "소원등 받기", 10)) ||
    (await pulseUntil("KeyA", "소원등 받기", 20));
  if (!atTable) throw new Error("table prompt not found");
  await hold("KeyE", 60);
  await sleep(500);
  await evalJs(
    `(() => { const s = document.querySelector('section[aria-label="소원등 색상 선택"]'); const b = Array.from(s.querySelectorAll('button')).find(b => (b.getAttribute('aria-label')||b.textContent).includes('분홍')); (b || s.querySelectorAll('button')[1]).click(); return true; })()`,
  );
  await sleep(600);
  if (!(await pulseUntil("KeyA", "소원 작성하기", 10))) throw new Error("write prompt not found");
  await hold("KeyE", 60);
  await sleep(1200);
  const rect = await evalJs(
    `(() => { const c = Array.from(document.querySelectorAll('canvas')).find(c => !c.dataset.engine && c.width === 512 || c.getAttribute('aria-label')); const r = (c || document.querySelectorAll('canvas')[1]).getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`,
  );
  const [x, y, w, h] = rect;
  for (let s = 0; s < 2; s++) {
    const y0 = y + h * (0.35 + s * 0.25);
    await send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: x + w * 0.25,
      y: y0,
      button: "left",
      clickCount: 1,
    });
    for (let k = 1; k <= 12; k++)
      await send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: x + w * (0.25 + 0.04 * k),
        y: y0 + Math.sin(k) * 10,
        button: "left",
        buttons: 1,
      });
    await send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: x + w * 0.73,
      y: y0,
      button: "left",
      clickCount: 1,
    });
  }
  await sleep(300);
  await evalJs(
    `Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('완료')).click()`,
  );
  await sleep(1500);
  if (process.env.DEBUG_STEPS) {
    for (let i = 0; i < 6; i++) {
      await shot(`${LABEL}-step${i}`);
      console.log(
        i,
        await evalJs(
          "Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim()).filter(Boolean).join('|')",
        ),
      );
      await hold("KeyD", 90);
      await sleep(150);
    }
  }
  const lit =
    (await pulseUntil("KeyD", "불 붙이기", 20, 70)) ||
    (await pulseUntil("KeyA", "불 붙이기", 12, 90)) ||
    (await pulseUntil("KeyW", "불 붙이기", 8, 90)) ||
    (await pulseUntil("KeyS", "불 붙이기", 8, 90));
  if (!lit) throw new Error("campfire prompt not found");
  await hold("KeyE", 60);
  await sleep(2000);
}

async function launch(n) {
  await mark(`launch${n}:hold`);
  await key("keyDown", "KeyF");
  await sleep(3300);
  await key("keyUp", "KeyF");
  await mark(`launch${n}:holdDone`);
  let last = 0;
  for (const t of [2100, 4000, 5500, 7000]) {
    await sleep(t - last);
    last = t;
    await shot(`${LABEL}-launch${n}-${t}`);
  }
  await sleep(2000);
  await mark(`launch${n}:end`);
}
try {
  await prepareLantern(true);
  await shot(`${LABEL}-lit1`);
  await launch(1);
  await prepareLantern(false);
  await launch(2);
} catch (e) {
  console.log("FLOW ERROR", e.message);
  await shot(`${LABEL}-error`);
}
const data = await evalJs("JSON.stringify(window.__perf)");
writeFileSync(`${OUT}/${LABEL}.json`, data);
ws.close();
process.exit(0);
