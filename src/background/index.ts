import type { AnalyzeMessage, AnalyzeResponse } from "../shared/messages";
import { loadSettings } from "../shared/storage";
import { AnthropicClient } from "./providers/anthropic";
import { OpenAIClient } from "./providers/openai";

chrome.runtime.onMessage.addListener(
  (
    message: AnalyzeMessage,
    _sender,
    sendResponse: (r: AnalyzeResponse) => void
  ) => {
    if (message.type !== "ANALYZE") return false;

    // Handle asynchronously; return true to keep the channel open
    (async () => {
      const settings = await loadSettings();
      if (!settings) {
        sendResponse({
          success: false,
          error:
            "No API settings configured. Open the extension options and enter your provider and API key.",
        });
        return;
      }

      const client =
        settings.provider === "anthropic"
          ? new AnthropicClient()
          : settings.provider === "openai"
          ? new OpenAIClient()
          : null;

      if (!client) {
        sendResponse({
          success: false,
          error: `Unknown provider: "${settings.provider}".`,
        });
        return;
      }

      try {
        const result = await client.analyze(message.document, settings);
        sendResponse({ success: true, result });
      } catch (err) {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return true; // Keep the message channel open for the async response
  }
);
