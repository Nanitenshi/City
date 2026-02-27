let canvas, ctx;
let t = 0;
let mood = 0;
let paused = false;
let perfGetter = null;

export function initThree(c, getPerfMode) {
  canvas = c;
  ctx = canvas.getContext("2d", { alpha: true });
  perfGetter = getPerfMode;
  requestAnimationFrame(loop);
}

export function setPaused(p){ paused = !!p; }
export function setQuality(){ /* core resizes DPR */ }

export function setMoodProgress(p) {
  mood = Math.max(0, Math.min(1, p));
}

function loop() {
  if (!ctx) return;
  if (!paused) t += 0.016;
  drawCity2D();
  requestAnimationFrame(loop);
}

function drawCity2D() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0,0,w,h);

  const isPerf = (perfGetter?.() === "perf");
  const layers = isPerf ? 4 : 6;

  // mood sky
  const day = { r: 10, g: 18, b: 32 };
  const dusk = { r: 30, g: 12, b: 42 };
  const night = { r: 5, g: 7, b: 10 };

  const a = lerpRGB(day, dusk, Math.min(1, mood*2));
  const b = lerpRGB(dusk, night, Math.max(0, (mood-0.5)*2));
  const sky = lerpRGB(a, b, Math.max(0, (mood-0.5)*2));

  const grd = ctx.createLinearGradient(0,0,0,h);
  grd.addColorStop(0, `rgb(${sky.r},${sky.g},${sky.b})`);
  grd.addColorStop(1, `rgb(0,0,0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0,0,w,h);

  // parallax
  for (let i=0;i<layers;i++){
    const depth = i/(layers-1);
    const baseY = h*(0.35 + depth*0.35);
    const scroll = (t*(10 + depth*30)) % 160;
    const count = isPerf ? 18 : 28;

    for (let k=0;k<count;k++){
      const bw = 22 + (k*13 % 40) + depth*40;
      const bh = 50 + ((k*37)%160) + depth*260;
      const x = ((k*90) - scroll) % (w+200) - 100;
      const y = baseY - bh;

      ctx.fillStyle = `rgba(10,16,24,${0.28 + depth*0.22})`;
      ctx.fillRect(x,y,bw,bh);

      if (!isPerf || (k%3===0)){
        const neon = (k%2===0) ? "rgba(0,243,255,0.16)" : "rgba(255,0,124,0.12)";
        ctx.fillStyle = neon;
        for (let wy=0; wy<bh; wy+=18){
          if ((wy + k*7) % 36 === 0) ctx.fillRect(x+4, y+wy+8, Math.max(2,bw-8), 2);
        }
      }
    }
  }

  // haze
  ctx.fillStyle = "rgba(0,243,255,0.03)";
  ctx.fillRect(0,0,w,h);
}

function lerp(a,b,t){ return a+(b-a)*t; }
function lerpRGB(a,b,t){
  return { r: Math.round(lerp(a.r,b.r,t)), g: Math.round(lerp(a.g,b.g,t)), b: Math.round(lerp(a.b,b.b,t)) };
          }
