const handling = new Set();

async function isEnabled() {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  return enabled;
}

async function updateBadge() {
  const on = await isEnabled();
  chrome.action.setBadgeText({ text: on ? "ON" : "OFF" });
  chrome.action.setBadgeBackgroundColor({ color: on ? "#2e7d32" : "#777777" });
}

chrome.runtime.onInstalled.addListener(updateBadge);
chrome.runtime.onStartup.addListener(updateBadge);

chrome.action.onClicked.addListener(async () => {
  await chrome.storage.local.set({ enabled: !(await isEnabled()) });
  updateBadge();
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!sender.tab) return;
  if (msg.type === "video-ended") startCountdown(sender.tab);
  else if (msg.type === "countdown-done") switchAndClose(sender.tab);
});

// Returns the tab to switch to, or null if we shouldn't act on this tab.
async function pickNextTab(tab) {
  if (!(await isEnabled())) return null;
  if (tab.pinned) return null;
  const tabs = (await chrome.tabs.query({ windowId: tab.windowId })).sort(
    (a, b) => a.index - b.index
  );
  const others = tabs.filter((t) => t.id !== tab.id);
  if (!others.length) return null; // never close the last tab
  // Next tab to the right; if this was the last one, wrap to the first.
  return tabs.find((t) => t.index > tab.index) || others[0];
}

async function startCountdown(tab) {
  if (!(await pickNextTab(tab))) return;
  // The popup lives in the top frame only.
  chrome.tabs
    .sendMessage(tab.id, { type: "start-countdown" }, { frameId: 0 })
    .catch(() => {});
}

async function switchAndClose(tab) {
  if (handling.has(tab.id)) return;
  handling.add(tab.id);
  try {
    const next = await pickNextTab(tab);
    if (!next) return;

    await chrome.tabs.update(next.id, { active: true });
    await chrome.tabs.remove(tab.id);

    for (let i = 0; i < 3; i++) {
      try {
        await chrome.tabs.sendMessage(next.id, { type: "play-video" });
        break;
      } catch (_) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } finally {
    handling.delete(tab.id);
  }
}
