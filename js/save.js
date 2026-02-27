const KEY = "neonalley_save_v2";

export function saveNow(game) {
  try {
    localStorage.setItem(KEY, JSON.stringify(game));
  } catch {}
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch {}
}
