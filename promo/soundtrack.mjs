// Synthesises a 20 s soundtrack for promo.html (120 BPM beat + whooshes/pops on the scene cues).
// Everything is generated from oscillators and noise, so there are no licensing concerns.
//   node promo/soundtrack.mjs   → promo/soundtrack.wav
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SR = 44100;
const DUR = 20;
const N = SR * DUR;
const L = new Float32Array(N);
const R = new Float32Array(N);

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const add = (i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  L[i] += v * (1 - Math.max(0, pan));
  R[i] += v * (1 + Math.min(0, pan));
};

function kick(t, gain = 0.9) {
  const start = Math.round(t * SR);
  let phase = 0;
  for (let n = 0; n < SR * 0.45; n++) {
    const x = n / SR;
    const f = 45 + 110 * Math.exp(-x * 28);
    phase += (2 * Math.PI * f) / SR;
    add(start + n, Math.sin(phase) * Math.exp(-x * 7) * gain);
  }
}
function hat(t, gain = 0.12, pan = 0.3) {
  const start = Math.round(t * SR);
  let prev = 0;
  for (let n = 0; n < SR * 0.06; n++) {
    const w = rnd();
    const hp = w - prev; // crude high-pass
    prev = w;
    add(start + n, hp * Math.exp((-n / SR) * 70) * gain, pan);
  }
}
function clap(t, gain = 0.32) {
  const start = Math.round(t * SR);
  let lp = 0;
  for (let n = 0; n < SR * 0.22; n++) {
    const x = n / SR;
    lp += 0.45 * (rnd() - lp);
    const env = (x < 0.012 ? 1 : 0.6) * Math.exp(-x * 18);
    add(start + n, lp * env * gain, -0.1);
  }
}
function bass(t, freq, len = 0.22, gain = 0.28) {
  const start = Math.round(t * SR);
  for (let n = 0; n < SR * len; n++) {
    const x = n / SR;
    const env = Math.min(1, x * 200) * Math.exp(-x * 5);
    const v = Math.sin(2 * Math.PI * freq * x) + 0.35 * Math.sin(2 * Math.PI * freq * 2 * x);
    add(start + n, v * env * gain);
  }
}
function pad(t0, t1, freqs, gain = 0.05) {
  for (let n = Math.round(t0 * SR); n < Math.round(t1 * SR) && n < N; n++) {
    const x = n / SR - t0;
    const env = Math.min(1, x / 0.8) * Math.min(1, (t1 - n / SR) / 0.8);
    let v = 0;
    freqs.forEach((f, k) => (v += Math.sin(2 * Math.PI * f * x + k) + 0.3 * Math.sin(2 * Math.PI * f * 1.003 * x)));
    add(n, (v / freqs.length) * env * gain, Math.sin(x * 0.7) * 0.3);
  }
}
function whoosh(center, len = 0.6, gain = 0.4, up = true) {
  const start = Math.round((center - len / 2) * SR);
  let lp = 0;
  for (let n = 0; n < SR * len; n++) {
    const p = n / (SR * len);
    const env = Math.sin(Math.PI * p) ** 2;
    const cutoff = up ? 0.02 + 0.5 * p : 0.52 - 0.5 * p;
    lp += cutoff * (rnd() - lp);
    add(start + n, lp * env * gain, (p - 0.5) * 1.4);
  }
}
function pop(t, freq = 900, gain = 0.25) {
  const start = Math.round(t * SR);
  let phase = 0;
  for (let n = 0; n < SR * 0.12; n++) {
    const x = n / SR;
    phase += (2 * Math.PI * (freq * (1 + 1.5 * Math.exp(-x * 60)))) / SR;
    add(start + n, Math.sin(phase) * Math.exp(-x * 35) * gain);
  }
}
function ding(t, gain = 0.22) {
  const start = Math.round(t * SR);
  for (let n = 0; n < SR * 1.2; n++) {
    const x = n / SR;
    const v = Math.sin(2 * Math.PI * 1318.5 * x) + 0.5 * Math.sin(2 * Math.PI * 1975.5 * x) + 0.25 * Math.sin(2 * Math.PI * 2637 * x);
    add(start + n, v * Math.exp(-x * 4) * gain, 0.15);
  }
}
function impact(t, gain = 0.9) {
  kick(t, gain);
  const start = Math.round(t * SR);
  let lp = 0;
  for (let n = 0; n < SR * 0.9; n++) {
    const x = n / SR;
    lp += 0.08 * (rnd() - lp);
    add(start + n, lp * Math.exp(-x * 4) * 0.5);
  }
}
function riser(t0, t1, gain = 0.18) {
  let lp = 0;
  for (let n = Math.round(t0 * SR); n < Math.round(t1 * SR); n++) {
    const p = (n / SR - t0) / (t1 - t0);
    lp += (0.01 + 0.4 * p * p) * (rnd() - lp);
    add(n, lp * p * p * gain);
  }
}

// ── Arrangement (cue times match promo.html) ──
const BEAT = 0.5; // 120 BPM
impact(0.15, 0.7);
pad(0, 2.6, [220, 261.63, 329.63], 0.06);
riser(1.3, 2.25, 0.2);

// Groove from scene 2 until the dark scene ends.
const roots = [55, 43.65, 65.41, 49]; // A1 F1 C2 G1, one per bar
for (let t = 2.4, b = 0; t < 16.6; t += BEAT, b++) {
  const darkScene = t >= 13.8;
  kick(t, darkScene ? 1 : 0.85);
  hat(t + BEAT / 2, 0.11, b % 2 ? 0.35 : -0.35);
  if (b % 4 === 1 || b % 4 === 3) clap(t);
  const root = roots[Math.floor(b / 4) % roots.length];
  bass(t, root);
  bass(t + BEAT * 0.75, root * 2, 0.12, 0.16);
}
pad(2.4, 13.8, [220, 261.63, 329.63, 392], 0.025);

// Scene transitions
for (const c of [2.25, 4.95, 8.55, 11.15, 13.65]) whoosh(c, 0.55, 0.45, true);
whoosh(16.8, 0.5, 0.35, false);
// UI cues
[3.25, 3.67, 4.09].forEach((t, i) => pop(t, 760 + i * 140, 0.22));
pop(5.65, 900);
[6.05, 6.17, 6.29].forEach((t) => pop(t, 1400, 0.05));
pop(6.9, 1100, 0.24);
pop(7.2, 800, 0.2);
whoosh(9.75, 0.5, 0.25, true);
ding(12.15);
pop(12.3, 950, 0.2);
pop(12.55, 700, 0.15);
// Dark stats: a hit per word
[14.05, 15.0, 15.95].forEach((t) => impact(t, 0.55));
// Outro
impact(16.95, 0.8);
pad(16.9, 20, [220, 277.18, 329.63, 440], 0.07);
pop(18.0, 1000, 0.28);
ding(18.05, 0.12);

// ── Master: soft clip, fade-out, write 16-bit stereo WAV ──
let peak = 0;
for (let n = 0; n < N; n++) peak = Math.max(peak, Math.abs(L[n]), Math.abs(R[n]));
const gain = 0.9 / Math.max(1, peak * 0.6);
const buf = Buffer.alloc(44 + N * 4);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write("WAVEfmt ", 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(N * 4, 40);
for (let n = 0; n < N; n++) {
  const fade = Math.min(1, (DUR - n / SR) / 1.2);
  for (const [ch, arr] of [[0, L], [1, R]]) {
    const v = Math.tanh(arr[n] * gain) * fade;
    buf.writeInt16LE(Math.round(v * 32000), 44 + n * 4 + ch * 2);
  }
}
const out = path.join(here, "soundtrack.wav");
fs.writeFileSync(out, buf);
console.log("wrote", out);
