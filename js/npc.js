import { game } from "./core.js";
import { setDialog, setComms, toast } from "./ui.js";

const NPCS = {
  NYX: {
    name: "NYX",
    color: "#00f3ff",
    vibe: "cold / tactical",
    lines: [
      "Move. Don’t pose. The city watches movement.",
      "Keep your heat low. Your shadow is loud.",
      "Pick targets like you pick exits."
    ]
  },
  GHOST: {
    name: "GHOST",
    color: "#ff007c",
    vibe: "smirk / risky",
    lines: [
      "Money’s a rumor until it hits your palm.",
      "You want safe? Go home. This is the Alley.",
      "Every tap leaves a trace. Yours are sloppy."
    ]
  },
  BOSS: {
    name: "???",
    color: "#fcee0a",
    vibe: "presence",
    lines: [
      "You move like you belong here. You don’t.",
      "Run faster. The district remembers."
    ]
  }
};

const trust = { NYX: 0, GHOST: 0 };
let tickT = 0;

export function npcTick(dt) {
  tickT += dt;
  // optional later: timed comms/events
}

export function openNpcDialog(node) {
  const right = document.getElementById("rightPanel");
  right?.classList.remove("hidden");

  const npcKey = (node?.npc && NPCS[node.npc]) ? node.npc : "BOSS";
  const npc = NPCS[npcKey];

  // portrait
  paintPortrait(npcKey);

  const header = document.getElementById("npcName");
  const role = document.getElementById("npcRole");
  if (header) header.textContent = `${npc.name} // ${node?.name || "SIGNAL"}`;
  if (role) role.textContent = npc.vibe;

  const base = npc.lines[Math.floor(Math.random() * npc.lines.length)];

  const choices = [
    {
      label: "“What’s the play?”",
      onPick: () => {
        bumpTrust(npcKey, +1);
        setComms(`${npc.name}: “Watch routes. Don’t get boxed.”`);
        setDialog(`${base}\n\n${npc.name}: “You want progress? Complete missions clean.”`, []);
        toast("TRUST +1");
      }
    },
    {
      label: "“Pay me.”",
      onPick: () => {
        bumpTrust(npcKey, -1);
        game.heat = Math.min(100, game.heat + 2);
        setComms(`${npc.name}: “Greed is loud.”`);
        setDialog(`${npc.name}: “Earn it. Then we talk price.”\n(Heat +2)`, []);
        toast("TRUST -1");
      }
    }
  ];

  setDialog(base, choices);

  // show trust snapshot in run log
  const rl = document.getElementById("runLog");
  if (rl) rl.textContent = `TRUST — NYX ${trust.NYX} / GHOST ${trust.GHOST}`;
}

function bumpTrust(key, v) {
  if (key !== "NYX" && key !== "GHOST") return;
  trust[key] = Math.max(-9, Math.min(9, trust[key] + v));
}

function paintPortrait(npcKey) {
  const host = document.getElementById("npcPortrait");
  if (!host) return;

  const npc = NPCS[npcKey] || NPCS.BOSS;

  // Inline “portrait” als SVG (schnell, keine Assets)
  host.innerHTML = `
    <svg viewBox="0 0 600 240" width="100%" height="100%" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stop-color="${npc.color}" stop-opacity="0.18"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.0"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="0" y="0" width="600" height="240" fill="url(#g)"/>
      <circle cx="120" cy="120" r="70" fill="${npc.color}" opacity="0.15" filter="url(#glow)"/>
      <path d="M90,165 C120,90 160,90 190,165" fill="none" stroke="${npc.color}" stroke-width="5" opacity="0.7"/>
      <circle cx="110" cy="120" r="6" fill="${npc.color}" opacity="0.85"/>
      <circle cx="150" cy="120" r="6" fill="${npc.color}" opacity="0.85"/>
      <text x="220" y="110" fill="${npc.color}" font-family="ui-monospace, monospace" font-size="26" letter-spacing="6" opacity="0.95">${npc.name}</text>
      <text x="220" y="145" fill="#d9e7ee" font-family="ui-monospace, monospace" font-size="14" opacity="0.8">${npc.vibe}</text>
    </svg>
  `;
}
