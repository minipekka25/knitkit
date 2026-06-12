// localStorage-backed store for remote overrides. Maps a remote NAME to a manifest URL
// (typically a localhost URL) that should be used instead of the deployed manifest.

const KEY = "fedkit:overrides";

function store(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    // localStorage access can throw (disabled cookies, sandboxed iframe, etc.).
    return null;
  }
}

export function getOverrides(): Record<string, string> {
  const s = store();
  if (!s) return {};
  try {
    const raw = s.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function setOverride(name: string, manifestUrl: string): void {
  const s = store();
  if (!s) return;
  const all = getOverrides();
  all[name] = manifestUrl;
  s.setItem(KEY, JSON.stringify(all));
}

export function removeOverride(name: string): void {
  const s = store();
  if (!s) return;
  const all = getOverrides();
  delete all[name];
  s.setItem(KEY, JSON.stringify(all));
}

export function clearOverrides(): void {
  store()?.removeItem(KEY);
}
