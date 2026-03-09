import { loadSettings, saveSettings } from "../shared/storage";
import type { Settings, Provider } from "../shared/types";

const form = document.getElementById("settings-form") as HTMLFormElement;
const providerSelect = document.getElementById("provider") as HTMLSelectElement;
const apiKeyInput = document.getElementById("api-key") as HTMLInputElement;
const modelInput = document.getElementById("model") as HTMLInputElement;
const statusMsg = document.getElementById("status-msg") as HTMLDivElement;

async function init(): Promise<void> {
  const settings = await loadSettings();
  if (settings) {
    providerSelect.value = settings.provider;
    apiKeyInput.value = settings.apiKey;
    modelInput.value = settings.model;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  handleSave().catch(console.error);
});

async function handleSave(): Promise<void> {
  const provider = providerSelect.value as Provider;
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim();

  if (!apiKey) {
    showStatus("API key is required.", "error");
    return;
  }

  const settings: Settings = { provider, apiKey, model };

  try {
    await saveSettings(settings);
    showStatus("Settings saved.", "success");
  } catch (err) {
    showStatus(
      `Failed to save settings: ${err instanceof Error ? err.message : String(err)}`,
      "error"
    );
  }
}

function showStatus(msg: string, type: "error" | "success"): void {
  statusMsg.textContent = msg;
  statusMsg.className = `status ${type}`;
}

init().catch(console.error);
