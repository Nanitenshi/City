const $ = (id) => document.getElementById(id);

let api = null;
let toastTimer = null;

export function initUI(_api) {
  api = _api;

  $("btnTalk")?.addEventListener("click", (e)=>{ e.preventDefault(); api.talk(); }, { passive:false });
  $("btnMission")?.addEventListener("click", (e)=>{ e.preventDefault(); api.mission(); }, { passive:false });
  $("btnFocus")?.addEventListener("click", (e)=>{ e.preventDefault(); api.focus(); }, { passive:false });

  $("btnPause")?.addEventListener("click", (e)=>{ e.preventDefault(); api.pause(); }, { passive:false });
  $("btnQuality")?.addEventListener("click", (e)=>{ e.preventDefault(); api.quality(); }, { passive:false });
  $("btnSave")?.addEventListener("click", (e)=>{ e.preventDefault(); api.autosave(); }, { passive:false });

  $("btnStart")?.addEventListener("click", (e)=>{ e.preventDefault(); api.start(); }, { passive:false });
  $("btnReset")?.addEventListener("click", (e)=>{ e.preventDefault(); api.reset(); }, { passive:false });

  $("btnBackToCity")?.addEventListener("click", (e)=>{ e.preventDefault(); api.back(); }, { passive:false });
  $("btnCloseDialog")?.addEventListener("click", (e)=>{ e.preventDefault(); api.closeDialog(); }, { passive:false });

  // D-pad
  const dpad = $("dpad");
  dpad?.addEventListener("pointerdown", (e)=>{
    const btn = e.target?.closest?.(".dbtn");
    if (!btn) return;
    e.preventDefault();
    api.step(btn.dataset.dir);
  }, { passive:false });
}

export function toast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.add("hidden"), 1400);
}

export function setDialog({ name, role, text, choices, log }) {
  const n = $("npcName"); if (n) n.textContent = name;
  const r = $("npcRole"); if (r) r.textContent = role;
  const t = $("dialogText"); if (t) t.textContent = text;

  const cWrap = $("dialogChoices");
  if (cWrap) {
    cWrap.innerHTML = "";
    (choices || []).forEach(ch => {
      const b = document.createElement("button");
      b.className = "btn small";
      b.textContent = ch.label;
      b.addEventListener("click", (e)=>{ e.preventDefault(); ch.onPick?.(); }, { passive:false });
      cWrap.appendChild(b);
    });
  }

  const l = $("dialogLog");
  if (l && log) l.innerHTML = log.map(x=>`<div class="archRow">${escapeHtml(x)}</div>`).join("");
}

export function uiTick(game) {
  $("hudDistrict") && ($("hudDistrict").textContent = `Sector-${String(game.district).padStart(2,"0")}`);
  $("hudMoney") && ($("hudMoney").textContent = `E$ ${game.money}`);
  $("hudHeat") && ($("hudHeat").textContent = `${game.heat}%`);
  $("hudFrags") && ($("hudFrags").textContent = `${game.frags}`);
  $("hudTrust") && ($("hudTrust").textContent = `NYX ${game.trust.nyx} / GHOST ${game.trust.ghost}`);

  const t = $("hudTime");
  if (t) t.textContent = game.globalProgress < 0.35 ? "DAY" : (game.globalProgress < 0.7 ? "DUSK" : "NIGHT");

  const q = $("btnQuality"); if (q) q.textContent = (game.settings.quality === "perf") ? "PERF" : "SHARP";
  const a = $("btnSave"); if (a) a.textContent = game.settings.autosave ? "AUTO" : "MANUAL";
  const p = $("btnPause"); if (p) p.textContent = game.paused ? "RESUME" : "PAUSE";
}

export function setVisible(id, show){
  const el = $(id);
  if (!el) return;
  el.classList.toggle("hidden", !show);
}

export function setComms(text){
  const el = $("commsTicker");
  if (el) el.innerHTML = `<b>COMMS:</b> ${escapeHtml(text)}`;
}

export function setStoryArchive(rows){
  const el = $("storyArchive");
  if (!el) return;
  el.innerHTML = rows.map(x=>`<div class="archRow">${escapeHtml(x)}</div>`).join("");
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
    }
