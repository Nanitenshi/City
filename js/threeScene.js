let canvas, ctx;
let t = 0;
let mood = 0;

let paused = false;
let quality = { dpr: 1, perf: true };

export function initThree(c, q = { dpr: 1, perf: true }) {
  canvas = c;
  ctx = canvas.getContext("2d", { alpha: true });
  quality = q;
  resize();
  requestAnimationFrame(loop);
}

export function setPaused(p) {
  paused = !!p;
}

export function setQuality(q) {
  quality = q || quality;
  resize();
}

export function setMoodProgress(p) {
  mood = Math.max(0, Math.min(1, p));
}

function resize() {
  if (!canvas || !ctx) return;
  const dpr = Math.max(1, quality?.dpr || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);

function loop() {
  if (!ctx) return;

  if (!paused) t += 0.016;
  drawCity2D();

  requestAnimationFrame(loop);
}

function drawCity2D() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  const isPerf = !!quality?.perf;
  const layers = isPerf ? 4 : 6;

  // mood colors
  const day = { r: 10, g: 18, b: 32 };
  const dusk = { r: 30, g: 12, b: 42 };
  const night = { r: 5, g: 7, b: 10 };

  const c1 = lerpRGB(day, dusk, Math.min(1, mood * 2));
  const sky = lerpRGB(c1, night, Math.max(0, (mood - 0.5) * 2));

  // sky gradient
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, `rgb(${sky.r},${sky.g},${sky.b})`);
  grd.addColorStop(1, `rgb(0,0,0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  // sun/moon
  const orbX = w * (0.15 + mood * 0.7);
  const orbY = h * (0.20 + Math.sin(mood * Math.PI) * 0.08);
  ctx.beginPath();
  ctx.arc(orbX, orbY, 22, 0, Math.PI * 2);
  ctx.fillStyle = mood < 0.6 ? "rgba(252,238,10,0.25)" : "rgba(200,220,255,0.18)";
  ctx.fill();

  // parallax buildings
  for (let i = 0; i < layers; i++) {
    const depth = i / (layers - 1);
    const baseY = h * (0.40 + depth * 0.32);
    const scroll = (t * (10 + depth * 30)) % 180;

    const count = isPerf ? 16 : 26;
    for (let b = 0; b < count; b++) {
      const bw = 22 + (b * 13 % 40) + depth * 48;
      const bh = 70 + ((b * 37) % 160) + depth * 260;
      const x = ((b * 92) - scroll) % (w + 240) - 120;
      const y = baseY - bh;

      ctx.fillStyle = `rgba(10,16,24,${0.26 + depth * 0.22})`;
      ctx.fillRect(x, y, bw, bh);

      // neon windows (cheap)
      if (!isPerf || (b % 3 === 0)) {
        const neon = (b % 2 === 0) ? "rgba(0,243,255,0.16)" : "rgba(255,0,124,0.13)";
        ctx.fillStyle = neon;
        for (let wy = 0; wy < bh; wy += 18) {
          if ((wy + b * 7) % 36 === 0) ctx.fillRect(x + 4, y + wy + 10, Math.max(2, bw - 8), 2);
        }
      }
    }
  }

  // soft haze
  ctx.fillStyle = "rgba(0,243,255,0.03)";
  ctx.fillRect(0, 0, w, h);
}

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpRGB(a, b, t) {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t))
  };
}
