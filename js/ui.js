import { game } from "./core.js";

const $ = (id) => document.getElementById(id);

let api = null;
let toastTimer = null;

/* ============================= */
/* INIT                          */
/* ============================= */

export function initUI(_api) {
  api = _api;

  // TITLE
  $("btnStart")?.addEventListener("click", (e) => {
    e.preventDefault();
    api?.setMode?.("WORLD");
  }, { passive: false });

  $("btnReset")?.addEventListener("click", () => {
    api?.resetSave?.();
  });

  // WORLD
  $("btnMission")?.addEventListener("click", (e) => {
    e.preventDefault();
    api?.startMission?.();
  }, { passive: false });

  $("btnTalk")?.addEventListener("click", () => {
    api?.openNpcDialog?.(game.selectedNodeId);
  });

  $("btnFocus")?.addEventListener("click", () => {
    api?.focusToggle?.();
  });

  $("btnCloseRight")?.addEventListener("click", () => {
    $("rightPanel")?.classList.add("hidden");
  });

  // BOTTOM BAR
  $("btnPause")?.addEventListener("click", () => {
    api?.togglePause?.();
  });

  $("btnQuality")?.addEventListener("click", () => {
    api?.toggleQuality?.();
  });

  $("btnSave")?.addEventListener("click", () => {
    api?.toggleAutosave?.();
  });

  // RESULT
  $("btnBackToCity")?.addEventListener("click", () => {
    api?.setMode?.("WORLD");
  });
}

/* ============================= */
/* COMMS TICKER FIX             */
/* ============================= */

export function setComms(text) {
  const el = $("commsTicker");
  if (!el) return;

  el.innerHTML = `<b>COMMS:</b> ${text}`;
}

/* ============================= */
/* NODE LIST                     */
/* ============================= */

export function updateNodeList(nodes, selectedId, onPick) {
  const wrap = $("nodeList");
  if (!wrap) return;

  wrap.innerHTML = "";

  nodes.forEach(n => {
    const card = document.createElement("div");
    card.className = "nodeCard" + (n.id === selectedId ? " active" : "");

    const left = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = n.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = n.tag;

    left.appendChild(name);
    left.appendChild(meta);

    card.appendChild(left);

    card.addEventListener("click", () => onPick(n.id));
    wrap.appendChild(card);
  });
}

/* ============================= */
/* TOAST                         */
/* ============================= */

export function toast(msg) {
  const el = $("toast");
  if (!el) return;

  el.textContent = msg;
  el.classList.remove("hidden");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 2000);
}

/* ============================= */
/* HUD UPDATE                    */
/* ============================= */

export function uiTick(dt = 0) {
  $("hudDistrict") && ($("hudDistrict").textContent = `Sector-${game.district}`);
  $("hudMoney") && ($("hudMoney").textContent = `E$ ${game.money}`);
  $("hudHeat") && ($("hudHeat").textContent = `${game.heat}%`);
  $("hudFrags") && ($("hudFrags").textContent = `${game.frags}`);

  const timeLabel = $("hudTime");
  if (timeLabel) {
    if (game.globalProgress < 0.35) timeLabel.textContent = "DAY";
    else if (game.globalProgress < 0.7) timeLabel.textContent = "DUSK";
    else timeLabel.textContent = "NIGHT";
  }

  const pauseBtn = $("btnPause");
  if (pauseBtn) pauseBtn.textContent = game.paused ? "RESUME" : "PAUSE";

  const qualityBtn = $("btnQuality");
  if (qualityBtn) qualityBtn.textContent = game.settings.quality === "perf" ? "PERF" : "SHARP";

  const autoBtn = $("btnSave");
  if (autoBtn) autoBtn.textContent = game.settings.autosave ? "AUTO" : "MANUAL";
}
