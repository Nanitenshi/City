import { initThree, setMoodProgress, setPaused as setThreePaused } from "./threeScene.js";
import { initWorld, worldTick, handleWorldPointer, worldCancelPointer, worldSetFocusToggle, worldStep, getInteractTarget } from "./world.js";
import { initUI, uiTick, toast, setVisible, setStoryArchive, setComms, setDialog } from "./ui.js";
import { loadSave, saveNow, resetSave } from "./save.js";
import { npcMakeState, npcTalk } from "./npc.js";
import { startMissionFromTarget, missionTick, handleMissionPointer, missionCancelPointer, missionSetPaused } from "./missions.js";

export const game = {
  mode: "TITLE", // TITLE | WORLD | MISSION | RESULT
  paused: false,

  money: 0,
  heat: 0,
  frags: 0,

  district: 7,
  districtPenalty: 0, // increases overworld harshness on special fails

  globalProgress: 0,
  missionsDone: 0,
  steps: 0,

  trust: { nyx: 0, ghost: 0 },

  settings: { quality: "perf", autosave: true },

  story: [],
  npcState: npcMakeState(),

  canvases: { three: null, world: null, mission: null },
  ctx: { world: null, mission: null },

  lastMission: null
};

const $ = (id) => document.getElementById(id);

/* ---------------- MODE ---------------- */
function setMode(next){
  if (game.mode === next) return;

  worldCancelPointer?.();
  missionCancelPointer?.();

  game.mode = next;

  const worldOn = (next === "TITLE" || next === "WORLD");
  const missionOn = (next === "MISSION");

  if (game.canvases.world){
    game.canvases.world.style.display = worldOn ? "block" : "none";
    game.canvases.world.style.pointerEvents = worldOn ? "auto" : "none";
  }
  if (game.canvases.mission){
    game.canvases.mission.style.display = missionOn ? "block" : "none";
    game.canvases.mission.style.pointerEvents = missionOn ? "auto" : "none";
  }

  setVisible("title", next === "TITLE");
  setVisible("hudTop", next !== "TITLE");

  setVisible("leftPanel", next === "WORLD");
  setVisible("rightPanel", next === "WORLD");

  setVisible("missionHud", next === "MISSION");
  setVisible("result", next === "RESULT");

  setVisible("dpad", next === "WORLD");

  setPaused(false);
}

/* ---------------- PAUSE ---------------- */
function setPaused(p){
  game.paused = !!p;
  missionSetPaused?.(game.paused);
  setThreePaused?.(game.paused);
  toast(game.paused ? "PAUSED." : "RESUMED.");
}
function togglePause(){ setPaused(!game.paused); }

/* ---------------- PERF / DPR ---------------- */
function getDpr(){
  const raw = window.devicePixelRatio || 1;
  const cap = (game.settings.quality === "perf") ? 1.15 : 1.6;
  return Math.max(1, Math.min(cap, raw));
}

function resizeAll(){
  const dpr = getDpr();

  for (const key of ["three","world","mission"]){
    const canvas = game.canvases[key];
    if (!canvas) continue;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    const ctx = game.ctx[key];
    if (ctx) ctx.setTransform(dpr,0,0,dpr,0,0);
  }
}

/* ---------------- POINTER ROUTING ---------------- */
function bindCanvasPointers(canvas, handler, onlyWhen){
  if (!canvas) return;
  const opts = { passive:false };

  canvas.addEventListener("pointerdown", (e)=>{
    if (!onlyWhen()) return;
    if (game.paused) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    handler("down", e, game);
  }, opts);

  canvas.addEventListener("pointermove", (e)=>{
    if (!onlyWhen()) return;
    if (game.paused) return;
    e.preventDefault();
    handler("move", e, game);
  }, opts);

  canvas.addEventListener("pointerup", (e)=>{
    if (!onlyWhen()) return;
    e.preventDefault();
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    handler("up", e, game);
  }, opts);

  canvas.addEventListener("pointercancel", (e)=>{
    if (!onlyWhen()) return;
    e.preventDefault();
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    handler("cancel", e, game);
  }, opts);
}

/* ---------------- BOOT ---------------- */
function boot(){
  game.canvases.three = $("threeCanvas");
  game.canvases.world = $("worldCanvas");
  game.canvases.mission = $("missionCanvas");

  if (game.canvases.world) game.ctx.world = game.canvases.world.getContext("2d", { alpha:true });
  if (game.canvases.mission) game.ctx.mission = game.canvases.mission.getContext("2d", { alpha:true });

  // load save
  const saved = loadSave();
  if (saved){
    Object.assign(game, saved);
    // repair missing fields for safety
    game.settings ||= { quality:"perf", autosave:true };
    game.trust ||= { nyx:0, ghost:0 };
    game.story ||= [];
    game.npcState ||= npcMakeState();
    game.canvases = { three: game.canvases.three, world: game.canvases.world, mission: game.canvases.mission };
    game.ctx = { world: game.ctx.world, mission: game.ctx.mission };
  }

  initUI({
    start: () => { setMode("WORLD"); toast("NIGHT CITY ONLINE."); },
    reset: () => { if (confirm("WARNING: PURGE ALL DATA?")) { resetSave(); location.reload(); } },
    back: () => setMode("WORLD"),
    closeDialog: () => setDialog({ name:"SIGNAL", role:"", text:"", choices:[], log:[] }),

    talk: () => npcTalk(game, { getInteractTarget: () => getInteractTarget(game) }),
    mission: () => {
      const t = getInteractTarget(game);
      if (!t || t.type !== "mission"){
        toast("MOVE NEAR A MISSION NODE.");
        return;
      }
      const info = startMissionFromTarget(t);
      if (!info){
        toast("MISSION LINK FAILED.");
        return;
      }
      setMode("MISSION");
    },

    focus: () => worldSetFocusToggle?.(),
    pause: () => togglePause(),
    quality: () => {
      game.settings.quality = (game.settings.quality === "perf") ? "quality" : "perf";
      resizeAll();
      if (game.settings.autosave) saveNow(stripRuntime(game));
      toast(game.settings.quality === "perf" ? "QUALITY: PERF" : "QUALITY: SHARP");
    },
    autosave: () => {
      game.settings.autosave = !game.settings.autosave;
      if (game.settings.autosave) saveNow(stripRuntime(game));
      toast(game.settings.autosave ? "AUTO: ON" : "AUTO: OFF");
    },

    step: (dir) => worldStep(game, dir)
  });

  initThree(game.canvases.three, () => game.settings.quality);

  initWorld(game);

  bindCanvasPointers(game.canvases.world, handleWorldPointer, () => game.mode === "TITLE" || game.mode === "WORLD");
  bindCanvasPointers(game.canvases.mission, handleMissionPointer, () => game.mode === "MISSION");

  // keyboard movement (PC)
  window.addEventListener("keydown", (e)=>{
    if (game.mode !== "WORLD") return;
    if (e.key === "w" || e.key === "ArrowUp") worldStep(game,"up");
    if (e.key === "s" || e.key === "ArrowDown") worldStep(game,"down");
    if (e.key === "a" || e.key === "ArrowLeft") worldStep(game,"left");
    if (e.key === "d" || e.key === "ArrowRight") worldStep(game,"right");
    if (e.key === "Escape") togglePause();
  });

  resizeAll();
  window.addEventListener("resize", resizeAll);

  setMode("TITLE");
  toast("SYSTEM READY.");

  requestAnimationFrame(loop);
}

/* ---------------- LOOP ---------------- */
let lastTime = 0;
function loop(tNow){
  const dt = Math.min(0.033, ((tNow - lastTime)/1000) || 0);
  lastTime = tNow;

  game.globalProgress = Math.min(1, game.missionsDone / 10);
  setMoodProgress(game.globalProgress);

  if (!game.paused){
    if (game.mode === "WORLD"){
      worldTick(dt, game);
    }

    if (game.mode === "MISSION"){
      missionTick(dt, game, (resultData)=>{
        const out = resultData.apply();

        // apply
        game.money = out.money;
        game.frags = out.frags;
        game.heat = out.heat;
        game.lastMission = out.lastMission;

        // trust & fail logic
        if (resultData.win){
          game.missionsDone++;
          game.npcState.failsInRow = 0;
          // trust up for mission giver
          if (game.lastMission?.special) game.trust.nyx = clamp(game.trust.nyx + 1, -10, 10);
          else game.trust.ghost = clamp(game.trust.ghost + 1, -10, 10);
          game.story.push(`MISSION WIN: ${resultData.kind}${resultData.special ? " (SPECIAL)" : ""}`);
        } else {
          game.npcState.failsInRow++;
          // global trust decay when you’re sloppy
          game.trust.nyx = clamp(game.trust.nyx - 1, -10, 10);
          game.trust.ghost = clamp(game.trust.ghost - 1, -10, 10);
          game.story.push(`MISSION FAIL: ${resultData.kind}${resultData.special ? " (SPECIAL) — DISTRICT PUNISH" : ""}`);
        }

        // story archive UI
        setStoryArchive(game.story.slice(-18));

        // result text
        const res = $("resText");
        if (res){
          const lm = game.lastMission;
          res.textContent =
            `Result: ${resultData.win ? "SUCCESS" : "FAIL"}\n` +
            `Type: ${resultData.kind}${resultData.special ? " ★" : ""}\n` +
            `Score: ${lm?.score ?? 0}\n` +
            `Payout: E$ ${lm?.money ?? 0}\n` +
            `Frags: +${lm?.frags ?? 0}\n` +
            `Heat: +${lm?.heat ?? 0}\n` +
            (resultData.special && !resultData.win ? `\nDistrict Punish: +Penalty (${game.districtPenalty})` : "");
        }

        if (game.settings.autosave) saveNow(stripRuntime(game));

        setMode("RESULT");
      });
    }
  }

  uiTick(game);
  requestAnimationFrame(loop);
}

/* ---------------- SAVE: strip runtime refs ---------------- */
function stripRuntime(g){
  const clone = JSON.parse(JSON.stringify(g));
  clone.canvases = { three:null, world:null, mission:null };
  clone.ctx = { world:null, mission:null };
  return clone;
}

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

if (document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
      }
