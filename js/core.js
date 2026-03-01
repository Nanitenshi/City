import { initThree, setMoodProgress, setPaused as setThreePaused, setQuality as setThreeQuality } from "./threeScene.js";
import { initWorld, worldTick, handleWorldPointer, worldCancelPointer, worldSetFocusToggle, getSelectedNode } from "./world.js";
import { initUI, uiTick, toast, setComms, setDialog } from "./ui.js";
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
    quality: "perf", // perf | quality
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

  // kill pointer capture on switch
  worldCancelPointer?.();
  missionCancelPointer?.();

  game.mode = next;

  // canvas visibility + input routing
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

  // pause off when switching
  setPaused(false);
}

/* ---------------- PAUSE ---------------- */
export function setPaused(p) {
  game.paused = !!p;
  missionSetPaused?.(game.paused);
  setThreePaused?.(game.paused);

  const btnPause = $("btnPause");
  if (btnPause) btnPause.textContent = game.paused ? "RESUME" : "PAUSE";

  // WICHTIG: Pause darf NICHT autosave triggern -> das passiert nur über btnSave/visibilitychange
  toast(game.paused ? "PAUSED." : "RESUMED.");
}

export function togglePause() {
  setPaused(!game.paused);
}

/* ---------------- QUALITY / DPR ---------------- */
function getDpr() {
  const raw = window.devicePixelRatio || 1;
  const cap = (game.settings.quality === "perf") ? 1.1 : 1.6; // Tablet friendly
  return Math.max(1, Math.min(cap, raw));
}

function applyQualityToThree() {
  setThreeQuality?.({
    dpr: getDpr(),
    perf: game.settings.quality === "perf"
  });
}

function resizeAll() {
  const dpr = getDpr();

  for (const key of ["world", "mission"]) {
    const canvas = game.canvases[key];
    if (!canvas) continue;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    const ctx = game.ctx[key];
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  applyQualityToThree();
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

/* ---------------- BOOT ---------------- */
function boot() {
  game.canvases.three = $("threeCanvas");
  game.canvases.world = $("worldCanvas");
  game.canvases.mission = $("missionCanvas");

  if (game.canvases.world) game.ctx.world = game.canvases.world.getContext("2d", { alpha: true });
  if (game.canvases.mission) game.ctx.mission = game.canvases.mission.getContext("2d", { alpha: true });

  // load save
  const saved = loadSave();
  if (saved) {
    const { upgrades, settings, ...rest } = saved;
    Object.assign(game, rest);
    if (upgrades) Object.assign(game.upgrades, upgrades);
    if (settings) Object.assign(game.settings, settings);
  }

  // init ui
  initUI({
    setMode,
    startMission: () => {
      const node = getSelectedNode?.();
      if (!node) { toast("SELECT A NODE FIRST."); return; }

      // mission node?
      if (node.type !== "mission") {
        toast("NO MISSION HERE. PICK A MISSION NODE.");
        return;
      }

      startMission(node.missionType || "cache");
      setMode("MISSION");
      setComms(`LINK: ${node.name} // ${node.npc || "???"}`);
      toast("MISSION LINKED.");
    },
    openNpcDialog: () => {
      const node = getSelectedNode?.();
      if (!node) { toast("SELECT A NODE FIRST."); return; }
      openNpcDialog(node);
    },
    saveNow,
    resetSave,
    togglePause,
    toggleQuality: () => {
      game.settings.quality = (game.settings.quality === "perf") ? "quality" : "perf";
      if (game.settings.autosave) saveNow();
      resizeAll();
      toast(game.settings.quality === "perf" ? "QUALITY: PERF" : "QUALITY: SHARP");
      const b = $("btnQuality");
      if (b) b.textContent = game.settings.quality === "perf" ? "PERF" : "SHARP";
      b?.setAttribute("data-mode", game.settings.quality);
    },
    toggleAutosave: () => {
      game.settings.autosave = !game.settings.autosave;
      if (game.settings.autosave) saveNow();
      toast(game.settings.autosave ? "AUTO: ON" : "AUTO: OFF");
      const b = $("btnSave");
      if (b) b.textContent = game.settings.autosave ? "AUTO" : "MANUAL";
    },
    focusToggle: () => worldSetFocusToggle?.()
  });

  // init render layers
  if (game.canvases.three) initThree(game.canvases.three, { dpr: getDpr(), perf: game.settings.quality === "perf" });
  initWorld();

  // input routing
  bindCanvasPointers(game.canvases.world, handleWorldPointer, () => game.mode === "TITLE" || game.mode === "WORLD");
  bindCanvasPointers(game.canvases.mission, handleMissionPointer, () => game.mode === "MISSION");

  // title buttons
  $("btnStart")?.addEventListener("click", () => { setMode("WORLD"); toast("NIGHT CITY ONLINE."); }, { passive: false });

  $("btnReset")?.addEventListener("click", () => {
    if (confirm("WARNING: PURGE ALL DATA?")) {
      resetSave();
      location.reload();
    }
  });

  $("btnBackToCity")?.addEventListener("click", () => setMode("WORLD"));
  $("btnCloseRight")?.addEventListener("click", () => $("rightPanel")?.classList.add("hidden"));

  resizeAll();
  window.addEventListener("resize", resizeAll);

  // BOOT OK FLAG (für index boot guard)
  window.__BOOT_OK__ = true;

  setDialog("SYSTEM READY.", []);
  setComms("Nyx: “Move. Don’t pose. The city watches movement.”");
  toast("SYSTEM READY.");
  setMode("TITLE");

  requestAnimationFrame(loop);
}

/* ---------------- LOOP ---------------- */
let lastTime = 0;
let fpsAcc = 0, fpsN = 0, fpsLast = performance.now();

function loop(tNow) {
  const dt = Math.min(0.033, ((tNow - lastTime) / 1000) || 0);
  lastTime = tNow;

  // day/night progression
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
        if (res) res.textContent = `Run complete.\nEddies + Frags updated.\nHeat increased.`;
      });
    }
  }

  // fps
  fpsAcc += (dt > 0 ? (1 / dt) : 0);
  fpsN++;
  if (performance.now() - fpsLast > 500) {
    const el = $("hudFps");
    if (el) el.textContent = String(Math.round(fpsAcc / Math.max(1, fpsN)));
    fpsAcc = 0; fpsN = 0; fpsLast = performance.now();
  }

  uiTick(dt);
  requestAnimationFrame(loop);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
    }
