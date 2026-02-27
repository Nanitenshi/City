import { toast, setComms } from "./ui.js";

const cam = { x: 0, y: 0, zoom: 1 };
let focusZoom = false;

let dragging = false;
let last = { x: 0, y: 0 };
let dist = 0;
let pointerId = null;

const TILE = 42;            // tile size
const W = 30;               // map B width
const H = 18;               // map B height

// tile types
const T = {
  SAFE: 0,
  NOISE: 1,
  SURV: 2,
  MARKET: 3,
  GLITCH: 4,
  SPECIAL: 5
};

let map = [];
let npcs = [];
let missions = [];
let player = { tx: 2, ty: 2, moving: false, px: 0, py: 0, stepTimer: 0, stepDur: 0.10 };
let target = null; // current interact target in range

export function initWorld(game){
  map = buildMap(game);
  npcs = buildNpcs(game);
  missions = buildMissions(game);
  player.px = player.tx*TILE;
  player.py = player.ty*TILE;

  cam.x = player.px;
  cam.y = player.py;

  setComms("Nyx: “Move. Don’t pose. The city watches movement.”");
}

export function getInteractTarget(game){
  // prefer npc if closer
  return target;
}

export function worldSetFocusToggle(){
  focusZoom = !focusZoom;
  cam.zoom = focusZoom ? 1.35 : 1.0;
  toast(focusZoom ? "FOCUS ON." : "FOCUS OFF.");
}

export function worldCancelPointer(){
  dragging = false;
  try { if (pointerId != null) document.getElementById("worldCanvas")?.releasePointerCapture(pointerId); } catch {}
  pointerId = null;
}

export function worldStep(game, dir){
  if (game.paused || game.mode !== "WORLD") return;
  if (player.moving) return;

  let nx = player.tx, ny = player.ty;
  if (dir === "up") ny--;
  if (dir === "down") ny++;
  if (dir === "left") nx--;
  if (dir === "right") nx++;

  if (nx<0 || ny<0 || nx>=W || ny>=H) return;

  // walls: none (for now), but punish on SURV etc
  player.tx = nx; player.ty = ny;
  player.moving = true;
  player.stepTimer = 0;

  game.steps++;
  onStep(game);
}

function onStep(game){
  // find tile type
  const tt = map[gameIndex(player.tx, player.ty)];
  // sudden events tuned by districtPenalty + heat
  const danger = (game.heat/100) + (game.districtPenalty*0.15);

  if (tt === T.GLITCH && Math.random() < (0.22 + danger*0.25)){
    toast("GLITCH EVENT: +HEAT");
    game.heat = Math.min(100, game.heat + 5);
    setComms("SYSTEM: “Signal distortion. Eyes on you.”");
  }

  if (tt === T.SURV && Math.random() < (0.18 + danger*0.30)){
    toast("SURVEILLANCE: Heat spikes");
    game.heat = Math.min(100, game.heat + 7);
    setComms("Ghost: “You stepped where cameras breathe.”");
  }

  if (tt === T.MARKET && Math.random() < 0.16){
    // market mini reward
    const gain = 20 + Math.floor(Math.random()*25);
    game.money += gain;
    toast(`MARKET: +E$ ${gain}`);
    setComms("Market: “A cheap deal. Expensive consequences.”");
  }
}

export function worldTick(dt, game){
  const c = game.canvases.world;
  const ctx = game.ctx.world;
  if (!c || !ctx) return;

  // movement smoothing
  if (player.moving){
    player.stepTimer += dt;
    const t = Math.min(1, player.stepTimer / player.stepDur);
    const txp = player.tx*TILE;
    const typ = player.ty*TILE;
    player.px = lerp(player.px, txp, smooth(t));
    player.py = lerp(player.py, typ, smooth(t));
    if (t >= 1){
      player.px = txp; player.py = typ;
      player.moving = false;
    }
  }

  // camera follow (soft)
  cam.x = lerp(cam.x, player.px, 0.12);
  cam.y = lerp(cam.y, player.py, 0.12);

  // find interact target (within 1 tile)
  target = findTargetNear(game);

  draw(ctx, game);
}

function findTargetNear(game){
  const px = player.tx, py = player.ty;

  const nearNpc = npcs.find(n => Math.abs(n.tx-px)<=1 && Math.abs(n.ty-py)<=1);
  if (nearNpc) return { type:"npc", id: nearNpc.id, npc: nearNpc.npc, name: nearNpc.name, tag: nearNpc.tag };

  const nearMission = missions.find(m => Math.abs(m.tx-px)<=1 && Math.abs(m.ty-py)<=1);
  if (nearMission) return { type:"mission", id: nearMission.id, npc: nearMission.npc, name: nearMission.name, tag: nearMission.tag, missionType: nearMission.missionType, special: nearMission.special };

  return null;
}

function draw(ctx, game){
  const vw = window.innerWidth, vh = window.innerHeight;
  ctx.clearRect(0,0,vw,vh);

  // style shift by heat + district penalty
  const danger = (game.heat/100) + (game.districtPenalty*0.15);
  const tintR = Math.min(0.25, danger*0.18);
  const tintB = 0.10;

  // draw tiles around camera
  const left = Math.floor((cam.x - (vw/2)/cam.zoom)/TILE) - 2;
  const right = Math.floor((cam.x + (vw/2)/cam.zoom)/TILE) + 2;
  const top = Math.floor((cam.y - (vh/2)/cam.zoom)/TILE) - 2;
  const bottom = Math.floor((cam.y + (vh/2)/cam.zoom)/TILE) + 2;

  for (let y=top; y<=bottom; y++){
    for (let x=left; x<=right; x++){
      if (x<0||y<0||x>=W||y>=H) continue;
      const tt = map[gameIndex(x,y)];
      const sx = worldToScreenX(x*TILE, vw);
      const sy = worldToScreenY(y*TILE, vh);

      // base tile
      ctx.fillStyle = tileColor(tt, danger);
      ctx.fillRect(sx, sy, TILE*cam.zoom, TILE*cam.zoom);

      // grid line
      ctx.strokeStyle = "rgba(0,243,255,0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, TILE*cam.zoom, TILE*cam.zoom);

      // subtle danger tint overlay
      if (danger > 0.35){
        ctx.fillStyle = `rgba(255,0,124,${tintR})`;
        ctx.fillRect(sx, sy, TILE*cam.zoom, TILE*cam.zoom);
      } else {
        ctx.fillStyle = `rgba(0,243,255,${tintB*0.20})`;
        ctx.fillRect(sx, sy, TILE*cam.zoom, TILE*cam.zoom);
      }
    }
  }

  // NPC models (2.5D silhouette)
  for (const n of npcs){
    drawNpc(ctx, n, vw, vh, game);
  }

  // Mission markers
  for (const m of missions){
    drawMission(ctx, m, vw, vh, game);
  }

  // Player
  drawPlayer(ctx, vw, vh, game);

  // interaction hint
  if (target){
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(`↳ ${target.type.toUpperCase()}: ${target.name}`, 14, vh - 98);
  }
}

function drawPlayer(ctx, vw, vh, game){
  const sx = worldToScreenX(player.px, vw) + (TILE*cam.zoom*0.5);
  const sy = worldToScreenY(player.py, vh) + (TILE*cam.zoom*0.55);

  // glow base
  ctx.beginPath();
  ctx.fillStyle = "rgba(0,243,255,0.18)";
  ctx.arc(sx, sy, 16*cam.zoom, 0, Math.PI*2);
  ctx.fill();

  // body silhouette
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(sx-5*cam.zoom, sy-18*cam.zoom, 10*cam.zoom, 18*cam.zoom);
  ctx.fillRect(sx-9*cam.zoom, sy-10*cam.zoom, 18*cam.zoom, 6*cam.zoom);

  // visor
  ctx.fillStyle = "rgba(255,0,124,0.75)";
  ctx.fillRect(sx-6*cam.zoom, sy-16*cam.zoom, 12*cam.zoom, 3*cam.zoom);
}

function drawNpc(ctx, n, vw, vh, game){
  const sx = worldToScreenX(n.tx*TILE, vw) + TILE*cam.zoom*0.5;
  const sy = worldToScreenY(n.ty*TILE, vh) + TILE*cam.zoom*0.55;

  const isNyx = n.npc === "NYX";

  // halo
  ctx.beginPath();
  ctx.fillStyle = isNyx ? "rgba(255,0,124,0.18)" : "rgba(0,243,255,0.18)";
  ctx.arc(sx, sy, 18*cam.zoom, 0, Math.PI*2);
  ctx.fill();

  // silhouette
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(sx-6*cam.zoom, sy-18*cam.zoom, 12*cam.zoom, 18*cam.zoom);

  // eyes neon
  ctx.fillStyle = isNyx ? "rgba(255,0,124,0.85)" : "rgba(0,243,255,0.85)";
  ctx.fillRect(sx-5*cam.zoom, sy-15*cam.zoom, 10*cam.zoom, 3*cam.zoom);

  // name tag
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(n.name, sx + 14*cam.zoom, sy - 6*cam.zoom);
}

function drawMission(ctx, m, vw, vh, game){
  const sx = worldToScreenX(m.tx*TILE, vw) + TILE*cam.zoom*0.5;
  const sy = worldToScreenY(m.ty*TILE, vh) + TILE*cam.zoom*0.55;

  const col = m.special ? "rgba(252,238,10,0.90)" : "rgba(0,243,255,0.75)";
  ctx.strokeStyle = col;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(sx, sy, 14*cam.zoom, 0, Math.PI*2);
  ctx.stroke();

  // small “antenna”
  ctx.beginPath();
  ctx.moveTo(sx, sy - 18*cam.zoom);
  ctx.lineTo(sx, sy - 30*cam.zoom);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "11px ui-monospace, monospace";
  ctx.fillText(m.name, sx + 14*cam.zoom, sy - 6*cam.zoom);
}

/* ---------------- INPUT ---------------- */
export function handleWorldPointer(type, e, game){
  e.preventDefault();

  if (type === "down"){
    dragging = true;
    pointerId = e.pointerId;
    try { e.target.setPointerCapture(pointerId); } catch {}
    last = { x: e.clientX, y: e.clientY };
    dist = 0;
    return;
  }

  if (type === "move"){
    if (!dragging) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    dist += Math.abs(dx) + Math.abs(dy);

    // pan camera a bit (look around)
    cam.x -= (dx / cam.zoom);
    cam.y -= (dy / cam.zoom);

    last = { x: e.clientX, y: e.clientY };
    return;
  }

  if (type === "up" || type === "cancel"){
    if (!dragging) return;
    dragging = false;
    try { e.target.releasePointerCapture(pointerId); } catch {}
    pointerId = null;

    // tap to interact target if close
    if (dist < 10){
      if (target){
        toast(`TARGET: ${target.name}`);
      } else {
        // tap = quick step toward tap (one tile)
        const wpos = screenToWorld(e.clientX, e.clientY);
        const dx = wpos.x - player.px;
        const dy = wpos.y - player.py;
        if (Math.abs(dx) > Math.abs(dy)) worldStep(game, dx>0 ? "right":"left");
        else worldStep(game, dy>0 ? "down":"up");
      }
    }
  }
}

function worldToScreenX(wx, vw){ return (vw/2) + (wx - cam.x)*cam.zoom; }
function worldToScreenY(wy, vh){ return (vh/2) + (wy - cam.y)*cam.zoom; }
function screenToWorld(sx, sy){
  const vw = window.innerWidth, vh = window.innerHeight;
  return { x: (sx - vw/2)/cam.zoom + cam.x, y: (sy - vh/2)/cam.zoom + cam.y };
}

/* ---------------- MAP GEN ---------------- */
function buildMap(game){
  const arr = new Array(W*H).fill(T.SAFE);

  // base noise clusters
  for (let i=0;i<W*H;i++){
    const r = Math.random();
    if (r < 0.12) arr[i] = T.NOISE;
    else if (r < 0.18) arr[i] = T.SURV;
    else if (r < 0.22) arr[i] = T.GLITCH;
  }

  // market strip
  for (let x=8; x<22; x++){
    arr[gameIndex(x, 10)] = T.MARKET;
  }

  // special zones escalate with district penalty
  for (let k=0;k<3 + game.districtPenalty;k++){
    const x = 4 + Math.floor(Math.random()*(W-8));
    const y = 3 + Math.floor(Math.random()*(H-6));
    arr[gameIndex(x,y)] = T.SPECIAL;
  }

  // spawn area safer
  for (let y=0;y<5;y++){
    for (let x=0;x<6;x++){
      arr[gameIndex(x,y)] = T.SAFE;
    }
  }

  return arr;
}

function tileColor(tt, danger){
  if (tt === T.SAFE) return "rgba(10,16,24,0.75)";
  if (tt === T.NOISE) return "rgba(0,243,255,0.10)";
  if (tt === T.SURV) return "rgba(255,0,124,0.09)";
  if (tt === T.MARKET) return "rgba(252,238,10,0.08)";
  if (tt === T.GLITCH) return "rgba(182,0,255,0.08)";
  if (tt === T.SPECIAL) return `rgba(252,238,10,${0.10 + Math.min(0.18, danger*0.12)})`;
  return "rgba(10,16,24,0.75)";
}

function buildNpcs(game){
  return [
    { id:"nyx_1", npc:"NYX", name:"Nyx", tag:"Fixer signal. Sharp eyes.", tx: 6, ty: 5 },
    { id:"ghost_1", npc:"GHOST", name:"Ghost", tag:"Anonymous contact. Bad truth.", tx: 20, ty: 12 },
  ];
}

function buildMissions(game){
  // Map B: a few missions, one special
  return [
    { id:"m1", npc:"NYX", name:"Relay Tap", tag:"Fast job. Don’t look up.", tx: 10, ty: 6, missionType:"CACHE_POP", special:false },
    { id:"m2", npc:"GHOST", name:"Trace Path", tag:"Clean sequence. No mistakes.", tx: 18, ty: 8, missionType:"TRACE_PATH", special:false },
    { id:"m3", npc:"NYX", name:"Scanner Run", tag:"Avoid the beam. Breathe low.", tx: 14, ty: 13, missionType:"STEALTH_SCAN", special:true },
  ];
}

function gameIndex(x,y){ return y*W + x; }
function lerp(a,b,t){ return a+(b-a)*t; }
function smooth(t){ return t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
