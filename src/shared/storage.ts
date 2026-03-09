import type { Settings } from "./types";

const SETTINGS_KEY = "settings";

export async function loadSettings(): Promise<Settings | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(SETTINGS_KEY, (result) => {
      const s = result[SETTINGS_KEY] as Settings | undefined;
      if (s && s.provider && s.apiKey) {
        resolve(s);
      } else {
        resolve(null);
      }
    });
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

export function hasRequiredSettings(settings: Settings | null): boolean {
  return !!(settings?.provider && settings?.apiKey);
}
