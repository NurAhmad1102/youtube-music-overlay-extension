// Background Service Worker for YT Music Gaming Overlay
// Uses chrome.scripting to execute commands directly into the MAIN world (Zero isolated world footprint)

// Auto-inject bridge into already open YouTube Music tabs when extension is installed or updated
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const tabs = await chrome.tabs.query({ url: "*://music.youtube.com/*" });
    for (const tab of tabs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          files: ["content/ytm_bridge.js"]
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ["content/ytm_inject.css"]
        });
      } catch (e) {
        // Tab might still be loading or restricted
      }
    }
  } catch (err) {
    console.warn("[BG] Error auto-injecting bridge script:", err);
  }
});

// Helper to execute commands directly into the YouTube Music page context (MAIN world)
async function sendCommandToYTM(tabId, command) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: "MAIN",
      func: (cmd) => {
        window.postMessage({
          source: "YTM_OVERLAY_EXT",
          type: "COMMAND",
          command: cmd
        }, "*");
      },
      args: [command]
    });
  } catch (err) {
    console.warn("[BG] Could not execute command in tab:", err.message);
  }
}

// Listen for global keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const tabs = await chrome.tabs.query({ url: "*://music.youtube.com/*" });
    if (!tabs || tabs.length === 0) {
      console.log("[BG] No YouTube Music tab found for command:", command);
      return;
    }
    // Prefer currently active tab if multiple exist, otherwise fallback to first
    const targetTab = tabs.find(t => t.active) || tabs[0];
    await sendCommandToYTM(targetTab.id, command);
  } catch (err) {
    console.warn("[BG] Error handling command:", err);
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CHECK_YTM_TAB") {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ url: "*://music.youtube.com/*" });
        const targetTab = tabs.find(t => t.active) || (tabs.length > 0 ? tabs[0] : null);
        sendResponse({
          exists: tabs.length > 0,
          tabId: targetTab ? targetTab.id : null,
          tabTitle: targetTab ? targetTab.title : null
        });
      } catch (err) {
        sendResponse({ exists: false, tabId: null, tabTitle: null });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (message.type === "OPEN_YTM_TAB") {
    (async () => {
      try {
        const tab = await chrome.tabs.create({ url: "https://music.youtube.com/" });
        sendResponse({ success: true, tabId: tab.id });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === "FOCUS_YTM_TAB") {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ url: "*://music.youtube.com/*" });
        if (tabs.length > 0) {
          const tab = tabs.find(t => t.active) || tabs[0];
          await chrome.tabs.update(tab.id, { active: true });
          if (tab.windowId) {
            await chrome.windows.update(tab.windowId, { focused: true });
          }
          // Highlight the launcher button directly in the MAIN world
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              world: "MAIN",
              func: () => {
                window.postMessage({
                  source: "YTM_OVERLAY_EXT",
                  type: "HIGHLIGHT_LAUNCHER"
                }, "*");
              }
            });
          } catch (e) {}
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, reason: "No tab found" });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
