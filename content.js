(() => {
  const MIN_DURATION = 5; // ignore tiny clips / GIF-style videos (seconds)

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
  });

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
      if (attempt < 20) setTimeout(() => tryPlay(attempt + 1), 500); // wait for page to load
      return;
    }
    if (v.ended) v.currentTime = 0;
    try {
      await v.play();
    } catch (err) {
      // Autoplay policy blocked it: fall back to muted playback.
      try {
        v.muted = true;
        await v.play();
      } catch (_) {
        if (attempt < 20) setTimeout(() => tryPlay(attempt + 1), 500);
      }
    }
  }
})();
