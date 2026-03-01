import { game } from "./core.js";
import { setDialog, setComms, toast } from "./ui.js";

/* ============================= */
/* SIMPLE NPC SYSTEM             */
/* ============================= */

const npcs = {
  nyx: {
    id: "nyx",
    name: "Nyx",
    role: "Fixer",
    trust: 0,
    dialogs: [
      "Move. Don’t pose. The city watches movement.",
      "You survived. That means something.",
      "Don’t waste momentum."
    ]
  },
  ghost: {
    id: "ghost",
    name: "Ghost",
    role: "Unknown Signal",
    trust: -1,
    dialogs: [
      "You move like you belong here. You don’t.",
      "Heat follows you.",
      "You are being measured."
    ]
  }
};

/* ============================= */
/* REQUIRED EXPORTS              */
/* ============================= */

export function npcTick(dt = 0) {
  // Future: NPC world animations / events
  // For now just passive
}

export function openNpcDialog(nodeId) {
  // fallback if nothing selected
  const npc = npcs.nyx;

  const line = npc.dialogs[
    Math.floor(Math.random() * npc.dialogs.length)
  ];

  setDialog({
    title: npc.name,
    role: npc.role,
    text: line
  });

  setComms(`${npc.name}: "${line}"`);
  toast("DIALOG OPENED");
}
