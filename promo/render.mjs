// Renders promo.html to a 1080×1920 MP4 with headless Chrome + ffmpeg.
//
//   FFMPEG=path/to/ffmpeg node promo/render.mjs                 → project-videos/omarketing-reklama.mp4
//   FFMPEG=... node promo/render.mjs --audio promo/music.wav    → same, with a soundtrack
//   node promo/render.mjs --stills 0.5,3.5,7                    → PNG stills only (no ffmpeg needed)
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const FPS = Number(opt("--fps") ?? 30);
const stills = opt("--stills")?.split(",").map(Number);
const audio = opt("--audio");
const out = opt("--out") ?? path.join(here, "..", "project-videos", "omarketing-reklama.mp4");
const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9336;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(process.env.TEMP ?? "/tmp", "promo-chrome-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-color-profile=srgb", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });

let target;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try {
    target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === "page");
  } catch {}
}
if (!target) throw new Error("Chrome did not start");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) (pending.get(m.id)(m), pending.delete(m.id));
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

await send("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });
await send("Page.enable");
await send("Page.navigate", { url: pathToFileURL(path.join(here, "promo.html")).href + "#render" });
for (let i = 0; i < 100 && !(await evaluate("typeof window.ready !== 'undefined'").catch(() => false)); i++) await sleep(100);
await evaluate("window.ready");
const duration = await evaluate("window.DURATION");

async function frameAt(t, format = "png") {
  await evaluate(`seek(${t}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  const { data } = await send("Page.captureScreenshot", { format, ...(format === "jpeg" ? { quality: 95 } : {}) });
  return Buffer.from(data, "base64");
}

try {
  if (stills) {
    for (const t of stills) {
      const file = path.join(here, "stills", `t${t.toFixed(2)}.png`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, await frameAt(t));
      console.log("still", file);
    }
  } else {
    const ffmpegPath = process.env.FFMPEG;
    if (!ffmpegPath) throw new Error("Set FFMPEG to the path of an ffmpeg executable");
    const ff = spawn(
      ffmpegPath,
      [
        "-y", "-loglevel", "error",
        "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
        ...(audio ? ["-i", audio] : []),
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        ...(audio ? ["-c:a", "aac", "-b:a", "192k", "-shortest"] : []),
        out,
      ],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const total = Math.round(duration * FPS);
    for (let f = 0; f < total; f++) {
      const buf = await frameAt(f / FPS, "jpeg");
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      if (f % 60 === 0) process.stdout.write(`frame ${f}/${total}\r`);
    }
    ff.stdin.end();
    const code = await new Promise((r) => ff.on("close", r));
    if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
    console.log(`\nwrote ${out}`);
  }
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
}
