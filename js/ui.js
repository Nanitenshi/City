import { game } from "./core.js";
import { saveNow } from "./save.js";

const $ = (id) => document.getElementById(id);

let api = null;
let toastTimer = null;

export function initUI(_api) {
  api = _api;

  // LEFT PANEL
  const btnTalk = $("btnTalk");
  if (btnTalk) btnTalk.onclick = () => api.openNpcDialog(game.selectedNodeId);

  const btnMission = $("btnMission");
  if (btnMission) btnMission.onclick = () => api.startMission();

  const btnFocus = $("btnFocus");
  if (btnFocus) btnFocus.onclick = () => api.focusToggle?.();

  const btnCloseRight = $("btnCloseRight");
  if (btnCloseRight) btnCloseRight.onclick = () => {
    const rp = $("rightPanel");
    rp?.classList.add("hidden");
  };

  // BOTTOM BAR
  const btnPause = $("btnPause");
  if (btnPause) {
    btnPause.addEventListener("click", (e) => { e.preventDefault(); api.togglePause(); }, { passive: false });
    btnPause.addEventListener("touchstart", (e) => { e.preventDefault(); api.togglePause(); }, { passive: false });
  }

  const btnQuality = $("btnQuality");
  if (btnQuality) {
    btnQuality.addEventListener("click", (e) => { e.preventDefault(); api.toggleQuality(); }, { passive: false });
    btnQuality.addEventListener("touchstart", (e) => { e.preventDefault(); api.toggleQuality(); }, { passive: false });
  }

  const btnSave = $("btnSave");
  if (btnSave) {
    btnSave.addEventListener("click", (e) => { e.preventDefault(); api.toggleAutosave(); }, { passive: false });
    btnSave.addEventListener("touchstart", (e) => { e.preventDefault(); api.toggleAutosave(); }, { passive: false });
  }

  // TITLE buttons (WICHTIG: doppelt: click + touchstart)
  const btnStart = $("btnStart");
  if (btnStart) {
    btnStart.addEventListener("click", (e) => { e.preventDefault(); api.enterWorld?.(); }, { passive: false });
    btnStart.addEventListener("touchstart", (e) => { e.preventDefault(); api.enterWorld?.(); }, { passive: false });
  }

  const btnReset = $("btnReset");
  if (btnReset) {
    btnReset.addEventListener("click", (e) => { e.preventDefault(); api.resetAll?.(); }, { passive: false });
    btnReset.addEventListener("touchstart", (e) => { e.preventDefault(); api.resetAll?.(); }, { passive: false });
  }

  // --- MOVE STICK ---
  const stick = $("moveStick");
  const knob = stick?.querySelector(".stickKnob");
  let sid = null;
  let center = { x: 0, y: 0 };
  let active = false;
  const radius = 28;

  function setKnob(dx, dy) {
    if (!knob) return;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  function setMove(dx, dy) {
    api?.moveStick?.(dx / radius, dy / radius);
  }

  stick?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    sid = e.pointerId;
    active = true;
    const r = stick.getBoundingClientRect();
    center.x = r.left + r.width / 2;
    center.y = r.top + r.height / 2;
    try { stick.setPointerCapture(sid); } catch {}
  }, { passive: false });

  stick?.addEventListener("pointermove", (e) => {
    if (!active || e.pointerId !== sid) return;
    e.preventDefault();

    const dx0 = e.clientX - center.x;
    const dy0 = e.clientY - center.y;
    const len = Math.hypot(dx0, dy0);
    const cl = Math.min(radius, len);
    const dx = len ? (dx0 / len) * cl : 0;
    const dy = len ? (dy0 / len) * cl : 0;

    setKnob(dx, dy);
    setMove(dx, dy);
  }, { passive: false });

  function endStick(e) {
    if (!active) return;
    if (sid != null && e && e.pointerId !== sid) return;
    active = false;
    sid = null;
    try { stick?.releasePointerCapture?.(e.pointerId); } catch {}
    setKnob(0, 0);
    api?.moveStick?.(0, 0);
  }

  stick?.addEventListener("pointerup", (e) => { e.preventDefault(); endStick(e); }, { passive: false });
  stick?.addEventListener("pointercancel", (e) => { e.preventDefault(); endStick(e); }, { passive: false });

  // Autosave on background (nur wenn AUTO an)
  window.addEventListener("visibilitychange", () => {
    if (document.hidden && game.settings.autosave) saveNow();
  });
}

export function toast(msg) {
  const el = $("toast");
  if (!el) return;

  el.textContent = msg;
  el.classList.remove("hidden");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 1600);
}

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

    const badge = document.createElement("div");
    badge.className = "badge " + (n.type === "mission" ? "mission" : "npc");
    badge.textContent = n.type.toUpperCase();

    card.appendChild(left);
    card.appendChild(badge);

    card.addEventListener("click", () => onPick(n.id));
    card.addEventListener("touchstart", (e) => { e.preventDefault(); onPick(n.id); }, { passive: false });

    wrap.appendChild(card);
  });
}

export function uiTick(dt = 0) {
  const d = $("hudDistrict"); if (d) d.textContent = `Sector-${String(game.district).padStart(2,"0")}`;
  const m = $("hudMoney"); if (m) m.textContent = `E$ ${game.money}`;
  const h = $("hudHeat"); if (h) h.textContent = `${game.heat}%`;
  const f = $("hudFrags"); if (f) f.textContent = `${game.frags}`;

  const t = $("hudTime");
  if (t) t.textContent = game.globalProgress < 0.35 ? "DAY" : (game.globalProgress < 0.7 ? "DUSK" : "NIGHT");

  const cel = $("hudCelestial");
  if (cel) cel.textContent = (game.globalProgress < 0.6) ? "☀" : "🌙";

  const q = $("btnQuality");
  if (q) q.textContent = (game.settings.quality === "perf") ? "PERF" : "SHARP";

  const a = $("btnSave");
  if (a) a.textContent = game.settings.autosave ? "AUTO" : "MANUAL";

  const p = $("btnPause");
  if (p) p.textContent = game.paused ? "RESUME" : "PAUSE";

  // FPS (optional)
  const fps = $("hudFps");
  if (fps) {
    // dt kann 0 sein → nur anzeigen wenn dt > 0
    if (dt > 0.0001) fps.textContent = String(Math.round(1 / dt));
  }
    }
