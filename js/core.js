import { initThree, setMoodProgress } from "./threeScene.js";
import { initWorld, worldTick, handleWorldPointer, worldCancelPointer, worldSetFocusToggle } from "./world.js";
import { initUI, uiTick, toast } from "./ui.js";
import { loadSave, saveNow, resetSave } from "./save.js";
import { openNpcDialog, npcTick } from "./npc.js";
import { startMission, missionTick, handleMissionPointer, missionCancelPointer, missionSetPaused } from "./missions.js";

export const game = {
  mode: "TITLE", // TITLE | WORLD | MISSION | RESULT
  paused: false,

  money: 0,
  heat: 0,
  frags: 0,
  district: 7,
  globalProgress: 0,
  storyIndex: 0,
  missionsDone: 0,

  settings: {
    quality: "perf",   // "perf" | "sharp"
    autosave: true
  },

  upgrades: { buffer: 0, amplifier: 0, pulse: 0 },
  selectedNodeId: null,

  canvases: { three: null, world: null, mission: null },
  ctx: { world: null, mission: null }
};

const $ = (id) => document.getElementById(id);

/* ---------------- MODE ---------------- */
export function setMode(next) {
  if (game.mode === next) return;

  // pointer capture sauber killen
  worldCancelPointer?.();
  missionCancelPointer?.();

  game.mode = next;

  // canvases
  if (game.canvases.world) {
    const on = next === "TITLE" || next === "WORLD";
    game.canvases.world.style.display = on ? "block" : "none";
    game.canvases.world.style.pointerEvents = on ? "auto" : "none";
  }
  if (game.canvases.mission) {
    const on = next === "MISSION";
    game.canvases.mission.style.display = on ? "block" : "none";
    game.canvases.mission.style.pointerEvents = on ? "auto" : "none";
  }

  // UI panels
  const toggle = (id, show) => {
    const el = $(id);
    if (el) el.classList.toggle("hidden", !show);
  };

  toggle("title", next === "TITLE");
  toggle("hudTop", next !== "TITLE");
  toggle("leftPanel", next === "WORLD");
  toggle("rightPanel", next === "WORLD");
  toggle("missionHud", next === "MISSION");
  toggle("result", next === "RESULT");

  // wenn du aus mission rausgehst: unpause
  setPaused(false);
}

/* ---------------- PAUSE ---------------- */
export function setPaused(p) {
  game.paused = !!p;
  missionSetPaused?.(game.paused);

  const btn = $("btnPause");
  if (btn) btn.textContent = game.paused ? "RESUME" : "PAUSE";
  toast(game.paused ? "PAUSED." : "RESUMED.");
}
export function togglePause() {
  setPaused(!game.paused);
}

/* ---------------- DPR / QUALITY ---------------- */
function getDpr() {
  const raw = window.devicePixelRatio || 1;

  // HONOR PAD x9a: lieber stabil. Perf: ~1.0-1.15, Sharp: ~1.4
  const cap = (game.settings.quality === "perf") ? 1.15 : 1.4;
  return Math.max(1, Math.min(cap, raw));
}

function resizeCanvas2D(canvas, ctx) {
  const dpr = getDpr();
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resizeAll() {
  if (game.canvases.world && game.ctx.world) resizeCanvas2D(game.canvases.world, game.ctx.world);
  if (game.canvases.mission && game.ctx.mission) resizeCanvas2D(game.canvases.mission, game.ctx.mission);
}

/* ---------------- POINTER ROUTING ---------------- */
function bindCanvasPointers(canvas, handler, onlyWhen) {
  if (!canvas) return;
  const opts = { passive: false };

  const fire = (type, e) => {
    if (!onlyWhen()) return;
    if (game.paused) return;
    e.preventDefault();
    handler(type, e);
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (!onlyWhen()) return;
    if (game.paused) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    handler("down", e);
  }, opts);

  canvas.addEventListener("pointermove", (e) => fire("move", e), opts);

  canvas.addEventListener("pointerup", (e) => {
    if (!onlyWhen()) return;
    e.preventDefault();
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    handler("up", e);
  }, opts);

  canvas.addEventListener("pointercancel", (e) => {
    if (!onlyWhen()) return;
    e.preventDefault();
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    handler("cancel", e);
  }, opts);
}

/* ---------------- GAME ACTIONS ---------------- */
function enterCity() {
  setMode("WORLD");
  toast("NIGHT CITY ONLINE.");
}

function startSelectedMission() {
  if (!game.selectedNodeId) {
    toast("SELECT A NODE FIRST.");
    return;
  }
  startMission("cache");
  setMode("MISSION");
  toast("MISSION LINKED.");
}

/* ---------------- BOOT ---------------- */
function boot() {
  game.canvases.three = $("threeCanvas");
  game.canvases.world = $("worldCanvas");
  game.canvases.mission = $("missionCanvas");

  if (game.canvases.world) game.ctx.world = game.canvases.world.getContext("2d", { alpha: true });
  if (game.canvases.mission) game.ctx.mission = game.canvases.mission.getContext("2d", { alpha: true });

  // save load
  const saved = loadSave();
  if (saved) {
    const { upgrades, settings, ...rest } = saved;
    Object.assign(game, rest);
    if (upgrades) Object.assign(game.upgrades, upgrades);
    if (settings) Object.assign(game.settings, settings);
  }

  // expose failsafe entry for index.html
  window.__enterCity = enterCity;

  // init modules
  initUI({
    setMode,
    startMission: startSelectedMission,
    openNpcDialog,
    saveNow,
    resetSave,
    togglePause,
    toggleQuality: () => {
      game.settings.quality = (game.settings.quality === "perf") ? "sharp" : "perf";
      if (game.settings.autosave) saveNow();
      resizeAll();
      toast(game.settings.quality === "perf" ? "QUALITY: PERF" : "QUALITY: SHARP");
      const b = $("btnQuality");
      if (b) b.textContent = (game.settings.quality === "perf") ? "PERF" : "SHARP";
    },
    toggleAutosave: () => {
      game.settings.autosave = !game.settings.autosave;
      saveNow();
      toast(game.settings.autosave ? "AUTO: ON" : "AUTO: OFF");
      const b = $("btnSave");
      if (b) b.textContent = game.settings.autosave ? "AUTO" : "MANUAL";
    },
    focusToggle: () => worldSetFocusToggle?.()
  });

  // background renderer
  if (game.canvases.three) initThree(game.canvases.three, () => game.settings.quality);

  // world init
  initWorld();

  // pointer routing
  bindCanvasPointers(game.canvases.world, handleWorldPointer, () => game.mode === "TITLE" || game.mode === "WORLD");
  bindCanvasPointers(game.canvases.mission, handleMissionPointer, () => game.mode === "MISSION");

  // Title buttons (extra-sicher)
  $("btnStart")?.addEventListener("click", (e) => { e.preventDefault(); enterCity(); }, { passive: false });
  $("btnReset")?.addEventListener("click", () => {
    if (confirm("WARNING: PURGE ALL DATA?")) {
      resetSave();
      location.reload();
    }
  });

  $("btnBackToCity")?.addEventListener("click", () => setMode("WORLD"), { passive: false });

  // right panel close
  $("btnCloseRight")?.addEventListener("click", (e) => {
    e.preventDefault();
    const rp = $("rightPanel");
    rp?.classList.add("hidden");
  }, { passive: false });

  resizeAll();
  window.addEventListener("resize", resizeAll);

  toast("SYSTEM READY.");
  setMode("TITLE");

  requestAnimationFrame(loop);
}

/* ---------------- LOOP ---------------- */
let lastTime = 0;
function loop(tNow) {
  const dt = Math.min(0.033, ((tNow - lastTime) / 1000) || 0);
  lastTime = tNow;

  // day/night drift
  game.globalProgress = Math.min(1, game.missionsDone / 12);
  setMoodProgress(game.globalProgress);

  if (!game.paused) {
    if (game.mode === "WORLD" || game.mode === "TITLE") {
      worldTick(dt);
      npcTick(dt);
    }

    if (game.mode === "MISSION") {
      missionTick(dt, (resultData) => {
        Object.assign(game, resultData.apply(game));
        game.missionsDone += 1;
        if (game.settings.autosave) saveNow();
        setMode("RESULT");

        const res = $("resText");
        if (res) res.textContent = `Run complete.\n+Eddies & +Frags applied.\nHeat shifted.`;
      });
    }
  }

  uiTick(dt);
  requestAnimationFrame(loop);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
                                       }
