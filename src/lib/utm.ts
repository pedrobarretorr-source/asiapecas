const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
const STORAGE_KEY = "asia_utm";

export type UtmData = Record<string, string>;

export function captureUtm(): UtmData {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const captured: UtmData = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) captured[k] = v;
    }
    if (Object.keys(captured).length > 0) {
      const existing = getUtm();
      const merged = { ...existing, ...captured, _captured_at: new Date().toISOString(), _landing: window.location.pathname };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return getUtm();
  } catch {
    return {};
  }
}

export function getUtm(): UtmData {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
