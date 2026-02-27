let canvas, ctx;

let t = 0;
let mood = 0;            // 0..1
let paused = false;

let quality = {
  dpr: 1.1,
  perf: true
};

export function initThree(c, q = { dpr: 1.1, perf: true }) {
  canvas = c;
  ctx = canvas.getContext("2d", { alpha: true });
  setQuality(q);
  requestAnimationFrame(loop);
}

export function setPaused(p) {
  paused = !!p;
}

export function setQuality(q) {
  quality.dpr = Math.max(1, Math.min(2, q?.dpr ?? 1.1));
  quality.perf = !!q?.perf;
}

export function setMoodProgress(p) {
  mood = Math.max(0, Math.min(1, p));
}

function loop() {
  if (!ctx || !canvas) return;

  if (!paused) t += 0.016;

  drawCity2D();
  requestAnimationFrame(loop);
}

function drawCity2D() {
  const w = canvas.width / (quality.dpr || 1);
  const h = canvas.height / (quality.dpr || 1);

  ctx.clearRect(0, 0, w, h);

  const isPerf = quality.perf;
  const layers = isPerf ? 4 : 6;

  // mood colors
  const day = { r: 10, g: 18, b: 32 };
  const dusk = { r: 30, g: 12, b: 42 };
  const night = { r: 5, g: 7, b: 10 };

  const c1 = lerpRGB(day, dusk, Math.min(1, mood * 2));
  const c2 = lerpRGB(dusk, night, Math.max(0, (mood - 0.5) * 2));
  const sky = mixRGB(c1, c2, Math.max(0, (mood - 0.5) * 2));

  // sky gradient
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, `rgb(${sky.r},${sky.g},${sky.b})`);
  grd.addColorStop(1, `rgb(0,0,0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // sun / moon
  drawCelestial(w, h);

  // parallax buildings
  for (let i = 0; i < layers; i++) {
    const depth = i / (layers - 1);
    const baseY = h * (0.35 + depth * 0.35);
    const scroll = (t * (10 + depth * 30)) % 160;

    const count = isPerf ? 18 : 28;
    for (let b = 0; b < count; b++) {
      const bw = 22 + ((b * 13) % 40) + depth * 40;
      const bh = 50 + ((b * 37) % 160) + depth * 260;
      const x = ((b * 90) - scroll) % (w + 200) - 100;
      const y = baseY - bh;

      ctx.fillStyle = `rgba(10,16,24,${0.28 + depth * 0.22})`;
      ctx.fillRect(x, y, bw, bh);

      // neon windows (cheap)
      if (!isPerf || (b % 3 === 0)) {
        const neon = (b % 2 === 0) ? "rgba(0,243,255,0.18)" : "rgba(255,0,124,0.14)";
        ctx.fillStyle = neon;
        for (let wy = 0; wy < bh; wy += 18) {
          if ((wy + b * 7) % 36 === 0) ctx.fillRect(x + 4, y + wy + 8, Math.max(2, bw - 8), 2);
        }
      }
    }
  }

  // soft haze
  ctx.fillStyle = "rgba(0,243,255,0.03)";
  ctx.fillRect(0, 0, w, h);
}

function drawCelestial(w, h) {
  const day = mood < 0.6;

  const x = w * (day ? 0.18 : 0.78);
  const y = h * (day ? 0.18 : 0.22);
  const r = day ? 18 : 14;

  ctx.save();
  ctx.globalAlpha = day ? 0.9 : 0.8;

  const g = ctx.createRadialGradient(x, y, 2, x, y, r * 5);
  g.addColorStop(0, day ? "rgba(252,238,10,0.35)" : "rgba(220,240,255,0.25)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = day ? "rgba(252,238,10,0.9)" : "rgba(220,240,255,0.85)";
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

  if (!day) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath(); ctx.arc(x - 4, y + 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y - 3, 2.2, 0, Math.PI * 2); ctx.fill();
  }

  ctx.restore();
}

function lerp(a, b, tt) { return a + (b - a) * tt; }
function lerpRGB(a, b, tt) {
  return {
    r: Math.round(lerp(a.r, b.r, tt)),
    g: Math.round(lerp(a.g, b.g, tt)),
    b: Math.round(lerp(a.b, b.b, tt))
  };
}
function mixRGB(a, b, tt) { return lerpRGB(a, b, tt); }
