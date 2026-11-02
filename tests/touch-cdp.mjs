// Real touch test: drives a headless Chrome over the DevTools protocol with Input.dispatchTouchEvent
// (genuine touch input: implicit pointer capture, touch-action, browser gesture cancellation),
// unlike synthetic PointerEvents in libro/tests/. No dependencies (Node 22+ WebSocket).
// Usage: node tests/touch-cdp.mjs [baseUrl]   (dev server running; Chrome installed)
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.argv[2] || "http://127.0.0.1:4173";
const chromePath = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9333;
const profile = mkdtempSync(join(tmpdir(), "touch-cdp-"));
const chrome = spawn(chromePath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let targets;
for (let i = 0; i < 50 && !targets; i += 1) {
  await wait(200);
  targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).catch(() => null);
}
const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

async function open(path) {
  await send("Page.navigate", { url: `${base}${path}` });
  for (let i = 0; i < 100; i += 1) {
    await wait(100);
    if ((await evaluate("document.documentElement.dataset.ready")) === "true") break;
  }
  await wait(600);
}

async function swipe(points, stepMs = 16) {
  const [x0, y0] = points[0];
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: y0 }] });
  let [px, py] = [x0, y0];
  for (const [x, y, ms] of points.slice(1)) {
    const steps = Math.max(1, Math.round(ms / stepMs));
    for (let i = 1; i <= steps; i += 1) {
      await wait(stepMs);
      await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: px + ((x - px) * i) / steps, y: py + ((y - py) * i) / steps }] });
    }
    [px, py] = [x, y];
  }
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await wait(1400);
}

async function doubleTap(x, y) {
  for (let i = 0; i < 2; i += 1) {
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await wait(40);
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await wait(90);
  }
  await wait(600);
}

const results = [];
const check = (name, ok, detail = "") => results.push(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
const page = () => evaluate("window.__libro.book.current");

await open("/libro/?intro=0&lang=es");
await evaluate("window.__libro.book.goTo(1), true");
await wait(1500);

const p0 = await page();
await swipe([[360, 600], [150, 600, 700]]); // slow, 55 %
check("deslizar lento (táctil real) pasa página", (await page()) === p0 + 1, `de ${p0} a ${await page()} · ${JSON.stringify(await evaluate("window.__libro.book.debug.lastGesture"))}`);

const p1 = await page();
await swipe([[360, 500], [290, 500, 45]], 15); // flick
check("flick corto (táctil real) pasa página", (await page()) === p1 + 1, `de ${p1} a ${await page()} · ${JSON.stringify(await evaluate("window.__libro.book.debug.lastGesture"))}`);

const p2 = await page();
await swipe([[40, 500], [300, 500, 600]]); // back
check("deslizar a la derecha vuelve", (await page()) === p2 - 1, `de ${p2} a ${await page()}`);

const p3 = await page();
await swipe([[200, 300], [205, 420, 400]]); // vertical: nothing
check("arrastre vertical no pasa página", (await page()) === p3);

await doubleTap(340, 300); // over the photo, away from the drinks
const zoom = await evaluate("window.visualViewport.scale");
check("doble toque no amplía", zoom === 1, `escala ${zoom}`);

// pinch: two fingers apart, then release
await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 170, y: 420, id: 1 }, { x: 220, y: 420, id: 2 }] });
for (let i = 1; i <= 12; i += 1) {
  await wait(16);
  await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 170 - i * 8, y: 420, id: 1 }, { x: 220 + i * 8, y: 420, id: 2 }] });
}
const during = await evaluate("getComputedStyle(document.querySelector('#stage')).transform");
const browserZoom = await evaluate("window.visualViewport.scale");
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
await wait(700);
const after = await evaluate("getComputedStyle(document.querySelector('#stage')).transform");
check("pellizco amplía la carta", during !== "none" && browserZoom === 1, `transform ${during}, zoom navegador ${browserZoom}`);
check("al soltar vuelve a su sitio", after === "none" || after === "matrix(1, 0, 0, 1, 0, 0)", `transform ${after}`);

console.log(results.join("\n"));
ws.close();
chrome.kill();
process.exit(results.some((line) => line.startsWith("✗")) ? 1 : 0);
