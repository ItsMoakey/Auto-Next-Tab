(() => {
  const MIN_DURATION = 5;        // ignore tiny clips / GIF-style videos (seconds)
  const COUNTDOWN_SECONDS = 5;   // grace period before the tab closes
  const IS_TOP = window === window.top;

  // "ended" doesn't bubble, so listen in the capture phase on the document.
  document.addEventListener(
    "ended",
    (e) => {
      const v = e.target;
      if (!(v instanceof HTMLVideoElement)) return;
      if (v.loop || !isFinite(v.duration) || v.duration < MIN_DURATION) return;
      if (document.querySelector(".html5-video-player.ad-showing")) return; // YouTube ads
      chrome.runtime.sendMessage({ type: "video-ended" }).catch(() => {});
    },
    true
  );

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "play-video") tryPlay(0);
    else if (IS_TOP && msg.type === "start-countdown") startCountdown();
  });

  // ---------- countdown popup (top frame only) ----------
  let host = null;
  let timer = null;

  function startCountdown() {
    if (host) return; // already counting down
    const end = Date.now() + COUNTDOWN_SECONDS * 1000;

    host = document.createElement("div");
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `
      <style>
        .box {
          position: fixed; right: 20px; bottom: 20px; z-index: 2147483647;
          display: flex; align-items: center; gap: 14px;
          padding: 12px 16px; border-radius: 10px;
          background: rgba(20,20,20,.94); color: #fff;
          font: 14px/1.3 system-ui, sans-serif;
          box-shadow: 0 4px 18px rgba(0,0,0,.45);
        }
        b { display: inline-block; min-width: 1ch; text-align: center; font-size: 16px; }
        button {
          border: 0; border-radius: 6px; padding: 6px 14px; cursor: pointer;
          background: #e53935; color: #fff; font: inherit; font-weight: 600;
        }
        button:hover { background: #c62828; }
      </style>
      <div class="box">
        <span>Video ended. Closing tab in <b>${COUNTDOWN_SECONDS}</b>s</span>
        <button type="button">Abort</button>
      </div>`;
    const num = root.querySelector("b");
    root.querySelector("button").addEventListener("click", cancelCountdown);

    // If the player is fullscreen, only elements inside it are visible.
    const fs = document.fullscreenElement;
    const parent = fs && fs.tagName !== "VIDEO" ? fs : document.documentElement;
    parent.appendChild(host);

    timer = setInterval(() => {
      const left = Math.ceil((end - Date.now()) / 1000);
      if (left <= 0) {
        cancelCountdown();
        chrome.runtime.sendMessage({ type: "countdown-done" }).catch(() => {});
      } else {
        num.textContent = left;
      }
    }, 250);
  }

  function cancelCountdown() {
    clearInterval(timer);
    timer = null;
    if (host) host.remove();
    host = null;
  }

  // ---------- autoplay in the newly focused tab ----------
  function bestVideo() {
    const vids = [...document.querySelectorAll("video")];
    if (!vids.length) return null;
    const area = (v) => {
      const r = v.getBoundingClientRect();
      return r.width * r.height;
    };
    return vids.sort((a, b) => area(b) - area(a))[0];
  }

  async function tryPlay(attempt) {
    const v = bestVideo();
    if (!v) {
      if (attempt < 20) setTimeout(() => tryPlay(attempt + 1), 500);
      return;
    }
    if (v.ended) v.currentTime = 0;
    try {
      await v.play();
    } catch (err) {
      try {
        v.muted = true; // autoplay policy fallback
        await v.play();
      } catch (_) {
        if (attempt < 20) setTimeout(() => tryPlay(attempt + 1), 500);
      }
    }
  }
})();
