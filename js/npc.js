import { setDialog, toast, setComms } from "./ui.js";

export function npcMakeState(){
  return {
    log: [],
    bossSeen: false,
    failsInRow: 0
  };
}

export function npcTalk(game, world){
  const target = world.getInteractTarget(game);
  if (!target){
    toast("NO SIGNAL IN RANGE.");
    return;
  }

  const npc = target.npc;
  const trust = npc === "NYX" ? game.trust.nyx : game.trust.ghost;

  // “Niederlagen = misstrauen”
  const cold = game.npcState.failsInRow >= 3;

  // Boss reveal early once
  if (!game.npcState.bossSeen && game.steps >= 12){
    game.npcState.bossSeen = true;
    game.story.push("BOSS REVEAL: A silhouette on the rooftop. Yellow eyes.");
    setComms(`??? : “You move like you belong here. You don’t.”`);
  }

  const base = getNpcLine(npc, trust, cold, game.heat);

  const choices = [
    {
      label: "Ask: What’s the real job?",
      onPick: () => {
        const delta = npc === "NYX" ? +1 : +1;
        applyTrust(game, npc, delta);
        addLog(game, `${npc}: ${base.followUp}`);
        rerender(game, npc, target);
      }
    },
    {
      label: "Lie: I already saw the data.",
      onPick: () => {
        // risk: trust down, but maybe reward
        const success = Math.random() < (0.35 + trust*0.02);
        if (success){
          applyTrust(game, npc, +2);
          game.money += 35;
          addLog(game, `${npc}: “Bold… and it worked. Take these Eddies.”`);
        } else {
          applyTrust(game, npc, -2);
          game.heat = Math.min(100, game.heat + 6);
          addLog(game, `${npc}: “Don’t try that again. The city hears lies.”`);
        }
        rerender(game, npc, target);
      }
    },
    {
      label: "Leave",
      onPick: () => {
        addLog(game, `SYSTEM: Link closed.`);
        rerender(game, npc, target);
      }
    }
  ];

  setDialog({
    name: `${npc} // ${target.name}`,
    role: cold ? "LINK DEGRADED // TRUST LOW" : "ENCRYPTED VOIP",
    text: base.text,
    choices,
    log: game.npcState.log.slice(-14)
  });

  toast("COMMS OPEN.");
}

function rerender(game, npc, target){
  const trust = npc === "NYX" ? game.trust.nyx : game.trust.ghost;
  const cold = game.npcState.failsInRow >= 3;
  const base = getNpcLine(npc, trust, cold, game.heat);

  setDialog({
    name: `${npc} // ${target.name}`,
    role: cold ? "LINK DEGRADED // TRUST LOW" : "ENCRYPTED VOIP",
    text: base.text,
    choices: [],
    log: game.npcState.log.slice(-14)
  });
}

function addLog(game, line){
  game.npcState.log.push(line);
}

function applyTrust(game, npc, delta){
  if (npc === "NYX") game.trust.nyx = clamp(game.trust.nyx + delta, -10, 10);
  else game.trust.ghost = clamp(game.trust.ghost + delta, -10, 10);
}

function getNpcLine(npc, trust, cold, heat){
  if (cold){
    return {
      text: npc === "NYX"
        ? "Nyx: “Du warst zu oft daneben. Ich kann dich nicht mehr decken.”"
        : "Ghost: “You’re noisy. Too many mistakes. I’m not your safety net.”",
      followUp: "…prove it. Bring results. Then we talk."
    };
  }

  if (npc === "NYX"){
    if (trust >= 6) return { text: "Nyx: “Du wirst besser. Ich mag das. Aber jetzt: echte Arbeit.”", followUp:"Arasaka isn’t the target… it’s the key." };
    if (heat >= 60) return { text: "Nyx: “Heat ist zu hoch. Bleib low. Keine Heldensachen.”", followUp:"If you fail a special run now, the district will clamp down." };
    return { text: "Nyx: “Sector-07 ist sauber. Das macht mir Angst.”", followUp:"Clean streets hide dirty cameras." };
  } else {
    if (trust >= 6) return { text: "Ghost: “You’re learning the rhythm. I can almost trust you.”", followUp:"Almost. Don’t let Nyx own you." };
    if (heat >= 60) return { text: "Ghost: “They smell you. Heat sticks to your shoes.”", followUp:"Lose Heat or the city will bite." };
    return { text: "Ghost: “Markets lie. Signals tell truth. Pick what you believe.”", followUp:"The boss watches early. Don’t blink." };
  }
}

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
