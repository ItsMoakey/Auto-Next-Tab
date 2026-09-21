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
  if (msg.type === "video-ended" && sender.tab) handleEnded(sender.tab);
});

async function handleEnded(tab) {
  if (handling.has(tab.id)) return; // several frames may fire at once
  handling.add(tab.id);
  try {
    if (!(await isEnabled())) return;
    if (tab.pinned) return;

    const tabs = (await chrome.tabs.query({ windowId: tab.windowId })).sort(
      (a, b) => a.index - b.index
    );
    const others = tabs.filter((t) => t.id !== tab.id);
    if (!others.length) return; // never close the last tab

    // Next tab to the right; if this was the last one, wrap to the first.
    const next = tabs.find((t) => t.index > tab.index) || others[0];

    await chrome.tabs.update(next.id, { active: true });
    await chrome.tabs.remove(tab.id);

    // Ask the newly focused tab to start playing (retry while it wakes up).
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
