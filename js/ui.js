import { game } from "./core.js";
import { saveNow } from "./save.js";

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

  // WORLD (LEFT PANEL)
  $("btnTalk")?.addEventListener("click", () => {
    api?.openNpcDialog?.(game.selectedNodeId);
  });

  $("btnMission")?.addEventListener("click", (e) => {
    e.preventDefault();
    api?.startMission?.();
  }, { passive: false });

  $("btnFocus")?.addEventListener("click", () => {
    api?.focusToggle?.();
  });

  // RESULT
  $("btnBackToCity")?.addEventListener("click", () => {
    api?.setMode?.("WORLD");
  });

  // BOTTOM BAR
  $("btnPause")?.addEventListener("click", (e) => {
    e.preventDefault();
    api?.togglePause?.();
  }, { passive: false });

  $("btnQuality")?.addEventListener("click", (e) => {
    e.preventDefault();
    api?.toggleQuality?.();
  }, { passive: false });

  $("btnSave")?.addEventListener("click", (e) => {
    e.preventDefault();
    api?.toggleAutosave?.();
  }, { passive: false });

  // Autosave on background (nur wenn AUTO an)
  window.addEventListener("visibilitychange", () => {
    if (document.hidden && game.settings?.autosave) saveNow();
  });
}

/* ============================= */
/* REQUIRED EXPORTS (BOOT FIXES) */
/* ============================= */

export function setComms(text) {
  const el = $("commsTicker");
  if (!el) return;
  el.innerHTML = `<b>COMMS:</b> ${text}`;
}

export function setDialog({ title = "SIGNAL", role = "", text = "—" } = {}) {
  const npcName = $("npcName");
  const npcRole = $("npcRole");
  const dialogText = $("dialogText");

  if (npcName) npcName.textContent = title;
  if (npcRole) npcRole.textContent = role;
  if (dialogText) dialogText.textContent = text;

  // rechte Box sicher sichtbar machen, wenn wir Dialog setzen
  const right = $("rightPanel");
  right?.classList.remove("hidden");
}

/* ============================= */
/* NODE LIST                     */
/* ============================= */

export function updateNodeList(nodes, selectedId, onPick) {
  const wrap = $("nodeList");
  if (!wrap) return;

  wrap.innerHTML = "";

  nodes.forEach((n) => {
    const card = document.createElement("div");
    card.className = "nodeCard" + (n.id === selectedId ? " active" : "");

    const left = document.createElement("div");

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = n.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = n.tag ?? "";

    left.appendChild(name);
    left.appendChild(meta);

    const badge = document.createElement("div");
    badge.className = "badge " + (n.type === "mission" ? "mission" : "npc");
    badge.textContent = (n.type || "").toUpperCase();

    card.appendChild(left);
    card.appendChild(badge);

    card.addEventListener("click", () => onPick(n.id));
    card.addEventListener("touchstart", (e) => {
      e.preventDefault();
      onPick(n.id);
    }, { passive: false });

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
  toastTimer = setTimeout(() => el.classList.add("hidden"), 1800);
}

/* ============================= */
/* HUD UPDATE                    */
/* ============================= */

export function uiTick(dt = 0) {
  const d = $("hudDistrict"); if (d) d.textContent = `Sector-${String(game.district).padStart(2, "0")}`;
  const m = $("hudMoney"); if (m) m.textContent = `E$ ${game.money}`;
  const h = $("hudHeat"); if (h) h.textContent = `${game.heat}%`;
  const f = $("hudFrags"); if (f) f.textContent = `${game.frags}`;

  const t = $("hudTime");
  if (t) t.textContent = game.globalProgress < 0.35 ? "DAY" : (game.globalProgress < 0.7 ? "DUSK" : "NIGHT");

  const q = $("btnQuality");
  if (q) q.textContent = (game.settings?.quality === "perf") ? "PERF" : "SHARP";

  const a = $("btnSave");
  if (a) a.textContent = game.settings?.autosave ? "AUTO" : "MANUAL";

  const p = $("btnPause");
  if (p) p.textContent = game.paused ? "RESUME" : "PAUSE";
}
