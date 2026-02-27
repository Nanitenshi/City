import { game } from "./core.js";
import { toast, updateNodeList } from "./ui.js";

const cam = { x: 0, y: 0, zoom: 1 };
const nodes = [];

let focusZoom = false;

let dragging = false;
let last = { x: 0, y: 0 };
let dist = 0;
let pointerId = null;

// Stick (-1..1)
let stickVX = 0;
let stickVY = 0;

// Simple “player”
const player = {
  x: 0,
  y: 0,
  r: 12
};

// simple district style
function districtStyle() {
  // du kannst später pro district komplett eigene palettes machen
  const d = game.district || 7;
  if (d % 3 === 0) return { tint: "rgba(255,0,124,0.08)", grid: "rgba(255,0,124,0.10)" };
  if (d % 3 === 1) return { tint: "rgba(0,243,255,0.06)", grid: "rgba(0,243,255,0.10)" };
  return { tint: "rgba(252,238,10,0.05)", grid: "rgba(252,238,10,0.08)" };
}

export function worldSetStick(vx, vy) {
  stickVX = Math.max(-1, Math.min(1, vx || 0));
  stickVY = Math.max(-1, Math.min(1, vy || 0));
}

export function initWorld() {
  nodes.length = 0;

  // Layout (kannst du später “Pokemon-Style” tile-map draus machen)
  const base = [
    { id: "A1", type: "npc", name: "Neon Gate", npc: "NYX", tag: "Clean start. Too clean.", district: 7 },
    { id: "M1", type: "mission", name: "Relay Tap", npc: "NYX", tag: "Trace the signal.", district: 7 },
    { id: "B1", type: "npc", name: "Alley Market", npc: "GHOST", tag: "Dirty deals. Quick money.", district: 7 },
    { id: "M2", type: "mission", name: "Cache Run", npc: "GHOST", tag: "Grab the data. Run.", district: 7 },
  ];

  base.forEach((n, i) => {
    nodes.push({
      ...n,
      x: (i % 2 ? 220 : -220) + (i * 30),
      y: -140 + i * 150
    });
  });

  player.x = 0;
  player.y = 0;

  updateNodeList(nodes, game.selectedNodeId, (id) => selectNodeById(id));
}

export function worldSetFocusToggle() {
  focusZoom = !focusZoom;
  cam.zoom = focusZoom ? 1.5 : 1.0;
  toast(focusZoom ? "FOCUS ON." : "FOCUS OFF.");
}

export function worldCancelPointer() {
  dragging = false;
  pointerId = null;
}

function worldToScreen(wx, wy) {
  return {
    x: (window.innerWidth / 2) + (wx - cam.x) * cam.zoom,
    y: (window.innerHeight / 2) + (wy - cam.y) * cam.zoom
  };
}
function screenToWorld(sx, sy) {
  return {
    x: (sx - window.innerWidth / 2) / cam.zoom + cam.x,
    y: (sy - window.innerHeight / 2) / cam.zoom + cam.y
  };
}

export function worldTick(dt = 0) {
  const c = game.canvases.world;
  const ctx = game.ctx.world;
  if (!c || !ctx) return;

  // apply stick movement (free move)
  if (game.mode === "WORLD" && !game.paused) {
    const dead = 0.16;
    const vx = Math.abs(stickVX) < dead ? 0 : stickVX;
    const vy = Math.abs(stickVY) < dead ? 0 : stickVY;

    if (vx || vy) {
      const sp = 260; // speed
      player.x += vx * sp * dt;
      player.y += vy * sp * dt;

      // camera follows player
      cam.x = lerp(cam.x, player.x, 0.10);
      cam.y = lerp(cam.y, player.y, 0.10);
    }
  }

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  const st = districtStyle();

  // district tint
  ctx.fillStyle = st.tint;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  drawGrid(ctx, st.grid);
  drawBuildings(ctx);
  drawNodes(ctx);
  drawPlayer(ctx);
}

function drawGrid(ctx, gridColor) {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  const step = 70 * cam.zoom;
  const offX = (-cam.x * cam.zoom) % step;
  const offY = (-cam.y * cam.zoom) % step;

  for (let x = offX; x < window.innerWidth; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, window.innerHeight); ctx.stroke();
  }
  for (let y = offY; y < window.innerHeight; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(window.innerWidth, y); ctx.stroke();
  }
}

function drawBuildings(ctx) {
  // fake silhouettes in world space around player/cam (cheap)
  const seed = (game.district || 7) * 999;
  const count = (game.settings?.quality === "perf") ? 18 : 28;

  for (let i = 0; i < count; i++) {
    const rx = pseudo(seed + i * 11) * 1800 - 900 + player.x * 0.15;
    const ry = pseudo(seed + i * 17) * 1400 - 700 + player.y * 0.15;

    const w = 70 + pseudo(seed + i * 31) * 160;
    const h = 140 + pseudo(seed + i * 47) * 360;

    const p = worldToScreen(rx, ry);
    const bw = w * cam.zoom;
    const bh = h * cam.zoom;

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(p.x - bw / 2, p.y - bh / 2, bw, bh);

    // neon edge
    if (i % 3 === 0) {
      ctx.strokeStyle = "rgba(0,243,255,0.10)";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - bw / 2, p.y - bh / 2, bw, bh);
    } else if (i % 5 === 0) {
      ctx.strokeStyle = "rgba(255,0,124,0.10)";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - bw / 2, p.y - bh / 2, bw, bh);
    }
  }
}

function drawNodes(ctx) {
  nodes.forEach(n => {
    const p = worldToScreen(n.x, n.y);
    const active = game.selectedNodeId === n.id;

    ctx.fillStyle = active ? "rgba(255,255,255,.9)" : (n.type === "mission" ? "rgba(0,243,255,.55)" : "rgba(255,0,124,.55)");
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 26 * cam.zoom, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(n.name, p.x + 22, p.y + 5);
  });
}

function drawPlayer(ctx) {
  const p = worldToScreen(player.x, player.y);

  // body
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(p.x, p.y, player.r * cam.zoom, 0, Math.PI * 2);
  ctx.fill();

  // visor glow
  ctx.strokeStyle = "rgba(0,243,255,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p.x, p.y, (player.r + 8) * cam.zoom, 0, Math.PI * 2);
  ctx.stroke();

  // direction hint
  const vx = stickVX, vy = stickVY;
  if (Math.hypot(vx, vy) > 0.2) {
    ctx.strokeStyle = "rgba(255,0,124,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + vx * 34, p.y + vy * 34);
    ctx.stroke();
  }
}

export function handleWorldPointer(type, e) {
  e.preventDefault();

  if (type === "down") {
    dragging = true;
    pointerId = e.pointerId;
    try { e.target.setPointerCapture(pointerId); } catch {}
    last = { x: e.clientX, y: e.clientY };
    dist = 0;
    return;
  }

  if (type === "move") {
    if (!dragging) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    dist += Math.abs(dx) + Math.abs(dy);

    cam.x -= dx / cam.zoom;
    cam.y -= dy / cam.zoom;
    last = { x: e.clientX, y: e.clientY };
    return;
  }

  if (type === "up" || type === "cancel") {
    if (!dragging) return;
    dragging = false;
    try { e.target.releasePointerCapture(pointerId); } catch {}

    if (dist < 10) {
      const w = screenToWorld(e.clientX, e.clientY);
      const hit = nodes.find(n => Math.hypot(w.x - n.x, w.y - n.y) < 30);
      if (hit) selectNodeById(hit.id);
    }
  }
}

function selectNodeById(id) {
  const n = nodes.find(x => x.id === id);
  if (!n) return;

  game.selectedNodeId = n.id;

  // right panel
  const npcName = document.getElementById("npcName");
  const npcRole = document.getElementById("npcRole");
  const dialog = document.getElementById("dialogText");

  if (npcName) npcName.textContent = `${n.npc} // ${n.name}`;
  if (npcRole) npcRole.textContent = (n.type === "mission") ? "MISSION OFFER" : "NPC SIGNAL";
  if (dialog) dialog.textContent = n.tag;

  // portrait style swap
  const portrait = document.getElementById("npcPortrait");
  if (portrait) {
    portrait.style.borderColor = (n.npc === "NYX") ? "rgba(0,243,255,.35)" : "rgba(255,0,124,.35)";
    portrait.style.boxShadow = (n.npc === "NYX") ? "0 0 22px rgba(0,243,255,.18)" : "0 0 22px rgba(255,0,124,.16)";

    portrait.style.background =
      (n.npc === "NYX")
        ? "radial-gradient(circle at 25% 30%, rgba(0,243,255,.22), transparent 55%), radial-gradient(circle at 75% 65%, rgba(255,0,124,.08), transparent 55%), linear-gradient(180deg, rgba(10,16,24,.8), rgba(0,0,0,.6))"
        : "radial-gradient(circle at 30% 35%, rgba(255,0,124,.22), transparent 55%), radial-gradient(circle at 70% 60%, rgba(0,243,255,.08), transparent 55%), linear-gradient(180deg, rgba(10,16,24,.8), rgba(0,0,0,.6))";
  }

  updateNodeList(nodes, game.selectedNodeId, (pickId) => selectNodeById(pickId));
  toast("NODE LOCKED.");
}

function lerp(a, b, t) { return a + (b - a) * t; }
function pseudo(n) {
  // deterministic 0..1
  const x = Math.sin(n * 999.123) * 43758.5453;
  return x - Math.floor(x);
      }
