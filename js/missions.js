import { toast } from "./ui.js";

let paused = false;
let pointerDown = false;

const mission = {
  active:false,
  kind:"CACHE_POP", // CACHE_POP | TRACE_PATH | STEALTH_SCAN
  special:false,

  timer:0,
  timeLimit:10,

  score:0,
  objective:0,
  progress:0,

  // internal
  caches:[],
  traceSeq:[],
  traceIndex:0,
  beamY:0,
  beamSpeed:220
};

export function missionSetPaused(p){ paused = !!p; }
export function missionCancelPointer(){ pointerDown = false; }

export function startMissionFromTarget(target){
  if (!target || target.type !== "mission") return null;

  // variety grows with district progress
  const roll = target.missionType;
  mission.kind = roll;
  mission.special = !!target.special;

  mission.active = true;
  mission.timer = 0;
  mission.score = 0;
  mission.progress = 0;

  if (mission.kind === "CACHE_POP"){
    mission.timeLimit = mission.special ? 9.0 : 10.0;
    mission.objective = mission.special ? 24 : 18;
    spawnCaches();
  } else if (mission.kind === "TRACE_PATH"){
    mission.timeLimit = mission.special ? 14.0 : 16.0;
    mission.objective = mission.special ? 10 : 8;
    makeTraceSeq(mission.objective);
  } else {
    mission.timeLimit = mission.special ? 14.0 : 16.0;
    mission.objective = mission.special ? 10 : 8;
    mission.beamY = 120;
    mission.beamSpeed = mission.special ? 260 : 220;
  }

  setHud();
  toast(mission.special ? "SPECIAL MISSION LINKED." : "MISSION LINKED.");
  return { kind: mission.kind, special: mission.special };
}

export function handleMissionPointer(type, e){
  if (!mission.active || paused) return;

  if (type === "down"){
    pointerDown = true;
    const x = e.clientX, y = e.clientY;

    if (mission.kind === "CACHE_POP"){
      const c = hitCache(x,y);
      if (c){
        popCache(c);
      }
    }

    if (mission.kind === "TRACE_PATH"){
      tapTrace(x,y);
    }

    if (mission.kind === "STEALTH_SCAN"){
      tapStealth(x,y);
    }
  }

  if (type === "up" || type === "cancel") pointerDown = false;
}

export function missionTick(dt, game, onFinish){
  if (!mission.active) return;

  // draw always
  draw(game);

  // hud always
  setHud();

  if (paused) return;

  mission.timer += dt;

  if (mission.kind === "STEALTH_SCAN"){
    // beam moves
    mission.beamY += mission.beamSpeed * dt;
    if (mission.beamY > window.innerHeight - 140) mission.beamY = 120;
  }

  const doneByProgress = (mission.progress >= mission.objective);
  const doneByTime = (mission.timer >= mission.timeLimit);

  if (doneByProgress || doneByTime){
    const win = doneByProgress;

    mission.active = false;

    // reward/penalty
    const result = computeResult(game, win);

    toast(win ? "MISSION COMPLETE." : "MISSION FAILED.");

    onFinish({
      win,
      kind: mission.kind,
      special: mission.special,
      apply: () => result
    });
  }
}

/* ---------------- HUD ---------------- */
function setHud(){
  const t = document.getElementById("mHudType"); if (t) t.textContent = mission.kind + (mission.special ? " ★" : "");
  const o = document.getElementById("mHudObjective"); if (o) o.textContent = `${mission.progress} / ${mission.objective}`;
  const s = document.getElementById("mHudScore"); if (s) s.textContent = String(mission.score);
  const timer = document.getElementById("mHudTimer"); if (timer) timer.textContent = `${Math.max(0, mission.timeLimit - mission.timer).toFixed(1)}s`;
  const st = document.getElementById("mHudStatus"); if (st) st.textContent = paused ? "PAUSED" : (mission.special ? "HIGH RISK" : "RUNNING");
}

/* ---------------- CACHE POP ---------------- */
function spawnCaches(){
  mission.caches.length = 0;
  const W = window.innerWidth, H = window.innerHeight;
  const top = 140, bottom = H - 140;

  for (let i=0;i<6;i++){
    mission.caches.push(makeCache(
      120 + Math.random()*(W-240),
      top + Math.random()*(bottom-top)
    ));
  }
}
function makeCache(x,y){
  return { x,y, rOuter:54+Math.random()*16, rInner:22+Math.random()*10, alive:true };
}
function hitCache(x,y){
  let best=null, bestD=1e9;
  for (const c of mission.caches){
    if (!c.alive) continue;
    const d = Math.hypot(x-c.x, y-c.y);
    const ringMin = c.rInner - 12;
    const ringMax = c.rOuter + 12;
    if (d>=ringMin && d<=ringMax && d<bestD){ bestD=d; best=c; }
  }
  return best;
}
function popCache(c){
  c.alive=false;
  mission.score += 1;
  mission.progress += 1;

  // respawn
  const W = window.innerWidth, H = window.innerHeight;
  const top = 140, bottom = H - 140;
  mission.caches.push(makeCache(
    120 + Math.random()*(W-240),
    top + Math.random()*(bottom-top)
  ));
}

/* ---------------- TRACE PATH ---------------- */
function makeTraceSeq(n){
  mission.traceSeq.length = 0;
  mission.traceIndex = 0;

  const W = window.innerWidth, H = window.innerHeight;
  const top = 150, bottom = H - 150;

  for (let i=0;i<n;i++){
    mission.traceSeq.push({
      x: 140 + Math.random()*(W-280),
      y: top + Math.random()*(bottom-top),
      r: 26
    });
  }
}
function tapTrace(x,y){
  const cur = mission.traceSeq[mission.traceIndex];
  if (!cur) return;
  if (Math.hypot(x-cur.x, y-cur.y) <= cur.r + 10){
    mission.traceIndex++;
    mission.progress++;
    mission.score += 2;
    // small time bonus for clean streak on special
    if (mission.special) mission.timer = Math.max(0, mission.timer - 0.25);
  } else {
    // miss penalty
    mission.score = Math.max(0, mission.score - 1);
    if (mission.special) mission.timer += 0.35;
  }
}

/* ---------------- STEALTH SCAN ---------------- */
function tapStealth(x,y){
  // safe tap = not inside scan beam
  const beamTop = mission.beamY, beamH = 52;
  const inBeam = y >= beamTop && y <= (beamTop + beamH);

  if (!inBeam){
    mission.progress++;
    mission.score += 2;
  } else {
    // caught
    mission.score = Math.max(0, mission.score - 2);
    mission.timer += (mission.special ? 0.65 : 0.45);
  }
}

/* ---------------- DRAW ---------------- */
function draw(game){
  const ctx = game.ctx.mission;
  if (!ctx) return;

  const W = window.innerWidth, H = window.innerHeight;
  ctx.clearRect(0,0,W,H);

  // overlay
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0,0,W,H);

  // title hint
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "12px ui-monospace, monospace";
  ctx.fillText(mission.special ? "SPECIAL RUN — district will punish failures" : "RUN — stay sharp", 16, 120);

  if (mission.kind === "CACHE_POP"){
    for (const c of mission.caches){
      if (!c.alive) continue;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(0,243,255,0.85)";
      ctx.beginPath(); ctx.arc(c.x,c.y,c.rOuter,0,Math.PI*2); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(255,0,124,0.75)";
      ctx.beginPath(); ctx.arc(c.x,c.y,c.rInner,0,Math.PI*2); ctx.stroke();
    }
  }

  if (mission.kind === "TRACE_PATH"){
    // draw remaining nodes, highlight current
    for (let i=0;i<mission.traceSeq.length;i++){
      const p = mission.traceSeq[i];
      const isCur = i === mission.traceIndex;
      ctx.lineWidth = isCur ? 6 : 3;
      ctx.strokeStyle = isCur ? "rgba(252,238,10,0.95)" : "rgba(0,243,255,0.55)";
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.stroke();

      // faint link line
      if (i>0){
        const a = mission.traceSeq[i-1];
        ctx.strokeStyle = "rgba(255,0,124,0.20)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(p.x,p.y); ctx.stroke();
      }
    }
  }

  if (mission.kind === "STEALTH_SCAN"){
    const beamH = 52;
    ctx.fillStyle = "rgba(255,0,124,0.12)";
    ctx.fillRect(0, mission.beamY, W, beamH);
    ctx.strokeStyle = "rgba(255,0,124,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, mission.beamY, W, beamH);

    // safe targets: tap anywhere outside beam (we show fake “safe pips” for guidance)
    ctx.fillStyle = "rgba(0,243,255,0.12)";
    for (let i=0;i<10;i++){
      const x = 40 + i*(W-80)/9;
      const y = (i%2===0) ? 170 : (H-170);
      ctx.beginPath(); ctx.arc(x,y,10,0,Math.PI*2); ctx.fill();
    }
  }
}

/* ---------------- RESULT (reward/penalty) ---------------- */
function computeResult(game, win){
  const baseMoney = win ? (mission.score * 4 + (mission.special ? 120 : 60)) : (mission.special ? 0 : 15);
  const baseFrags = win ? Math.floor(mission.score/2) + (mission.special ? 2 : 1) : 0;

  let heatDelta = win ? (mission.special ? 8 : 5) : (mission.special ? 14 : 9);

  // fail special punishes district
  if (!win && mission.special){
    heatDelta += 8;
    game.districtPenalty += 1; // makes overworld harsher
  }

  return {
    money: game.money + baseMoney,
    frags: game.frags + baseFrags,
    heat: Math.min(100, game.heat + heatDelta),
    lastMission: { win, kind: mission.kind, special: mission.special, score: mission.score, frags: baseFrags, money: baseMoney, heat: heatDelta }
  };
        }
