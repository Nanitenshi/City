import { game } from "./core.js";
import { toast, updateNodeList, setComms } from "./ui.js";

const cam = { x: 0, y: 0, zoom: 1 };
const nodes = [];

let dragging = false;
let last = { x: 0, y: 0 };
let dist = 0;
let pointerId = null;
let focusZoom = false;

export function initWorld() {
  nodes.length = 0;

  const base = [
    { id: "A1", type: "npc", name: "Neon Gate", npc: "NYX", tag: "Clean start. Too clean.", district: 7 },
    { id: "M1", type: "mission", name: "Cache Relay", npc: "NYX", tag: "Pop caches. Stay sharp.", district: 7, missionType: "cache" },
    { id: "B1", type: "npc", name: "Alley Market", npc: "GHOST", tag: "Dirty deals. Quick money.", district: 7 },
    { id: "M2", type: "mission", name: "Ghost Line", npc: "GHOST", tag: "Same job. Different rhythm.", district: 7, missionType: "cache" }
  ];

  base.forEach((n, i) => {
    nodes.push({
      ...n,
      x: (i % 2 ? 220 : -220) + (i * 40),
      y: -140 + i * 150
    });
  });

  // default select first
  game.selectedNodeId = game.selectedNodeId || nodes[0]?.id || null;
  updateNodeList(nodes, game.selectedNodeId, (id) => selectNodeById(id));

  toast("CITY LINKED. PICK A NODE.");
}

export function getSelectedNode() {
  return nodes.find(n => n.id === game.selectedNodeId) || null;
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

export function worldTick() {
  const ctx = game.ctx.world;
  if (!ctx) return;

  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.clearRect(0, 0, w, h);

  // grid
  ctx.strokeStyle = "rgba(0,243,255,.10)";
  ctx.lineWidth = 1;
  const step = 60 * cam.zoom;
  const offX = (-cam.x * cam.zoom) % step;
  const offY = (-cam.y * cam.zoom) % step;

  for (let x = offX; x < w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = offY; y < h; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // nodes
  nodes.forEach(n => {
    const p = worldToScreen(n.x, n.y);
    const active = game.selectedNodeId === n.id;

    // halo
    ctx.lineWidth = 3;
    ctx.strokeStyle = active ? "rgba(255,255,255,.8)" : "rgba(255,255,255,.18)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 22 * cam.zoom, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = n.type === "mission" ? "rgba(0,243,255,.55)" : "rgba(255,0,124,.55)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "12px ui-monospace, monospace";
    ctx.fillText(n.name, p.x + 26, p.y + 5);
  });
}

export function handleWorldPointer(type, e) {
  e.preventDefault();

  if (type === "down") {
    dragging = true;
    pointerId = e.pointerId;
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

    // tap?
    if (dist < 10) {
      const w = screenToWorld(e.clientX, e.clientY);
      const hit = nodes.find(n => Math.hypot(w.x - n.x, w.y - n.y) < 32);
      if (hit) selectNodeById(hit.id);
    }
  }
}

function selectNodeById(id) {
  const n = nodes.find(x => x.id === id);
  if (!n) return;

  game.selectedNodeId = n.id;

  // micro feedback
  setComms(`${n.npc || "SIGNAL"} // ${n.name}`);
  toast(n.type === "mission" ? "MISSION TARGET." : "NPC SIGNAL.");

  // right panel text
  const npcName = document.getElementById("npcName");
  const npcRole = document.getElementById("npcRole");
  const dialog = document.getElementById("dialogText");

  if (npcName) npcName.textContent = `${n.npc || "SIGNAL"} // ${n.name}`;
  if (npcRole) npcRole.textContent = n.type === "mission" ? "MISSION OFFER" : "NPC SIGNAL";
  if (dialog) dialog.textContent = n.tag;

  updateNodeList(nodes, game.selectedNodeId, (pickId) => selectNodeById(pickId));
}
