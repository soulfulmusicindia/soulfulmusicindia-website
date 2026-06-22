/**
 * AMBIENT MUSIC BAR — Soulful Music India
 * -----------------------------------------
 * A tap-to-play bar that streams straight from the live playlist.
 * Nothing plays until the visitor taps the button themselves — this is
 * deliberate: browsers block unmuted autoplay anyway, and a sound a
 * visitor chose to start feels welcoming instead of jarring.
 *
 * This script builds its own markup and injects it into the page, so
 * every page just needs these two <script> tags — no HTML to keep in
 * sync across the site.
 */

const BAR_HTML = `
<div class="ambient-bar" id="ambient-bar">
  <img class="ambient-thumb" id="ambient-thumb" src="/assets/logo.png" alt="">
  <div class="ambient-controls">
    <button class="ambient-side-btn" id="ambient-prev" aria-label="Previous track">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
    </button>
    <button class="ambient-toggle" id="ambient-toggle" aria-label="Play ambient music">
      <svg id="ambient-icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      <svg id="ambient-icon-pause" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
    </button>
    <button class="ambient-side-btn" id="ambient-next" aria-label="Next track">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6h2v12h-2zM6 6l8.5 6L6 18z"/></svg>
    </button>
  </div>
  <div class="ambient-info">
    <span class="ambient-label">Soulful Music India Radio</span>
    <span class="ambient-title" id="ambient-title">Tap play to begin a soulful session</span>
  </div>
  <div id="ambient-yt-player" class="ambient-yt-hidden"></div>
</div>`;

document.body.insertAdjacentHTML("beforeend", BAR_HTML);

let ytPlayer = null;
let isPlaying = false;

const toggleBtn = document.getElementById("ambient-toggle");
const prevBtn = document.getElementById("ambient-prev");
const nextBtn = document.getElementById("ambient-next");
const titleEl = document.getElementById("ambient-title");
const thumbEl = document.getElementById("ambient-thumb");
const iconPlay = document.getElementById("ambient-icon-play");
const iconPause = document.getElementById("ambient-icon-pause");

// Load the YouTube IFrame API script once.
const ytScript = document.createElement("script");
ytScript.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(ytScript);

window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player("ambient-yt-player", {
    height: "1",
    width: "1",
    playerVars: {
      listType: "playlist",
      list: SITE_CONFIG.playlistId,
      autoplay: 0,
      controls: 0,
      playsinline: 1
    },
    events: {
      onStateChange: onPlayerStateChange
    }
  });
};

function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    updateIcon();
    updateNowPlaying();
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    updateIcon();
  }
}

function updateNowPlaying() {
  try {
    const data = ytPlayer.getVideoData();
    if (data?.title) titleEl.textContent = data.title;
    if (data?.video_id) thumbEl.src = `https://i.ytimg.com/vi/${data.video_id}/hqdefault.jpg`;
  } catch {
    /* metadata not ready yet, ignore */
  }
}

function updateIcon() {
  iconPlay.style.display = isPlaying ? "none" : "block";
  iconPause.style.display = isPlaying ? "block" : "none";
  toggleBtn.classList.toggle("playing", isPlaying);
}

toggleBtn.addEventListener("click", () => {
  if (!ytPlayer || typeof ytPlayer.playVideo !== "function") return;
  if (isPlaying) {
    ytPlayer.pauseVideo();
  } else {
    titleEl.textContent = "Loading…";
    ytPlayer.playVideo();
  }
});

prevBtn.addEventListener("click", () => {
  if (!ytPlayer || typeof ytPlayer.previousVideo !== "function") return;
  ytPlayer.previousVideo();
  titleEl.textContent = "Loading…";
});

nextBtn.addEventListener("click", () => {
  if (!ytPlayer || typeof ytPlayer.nextVideo !== "function") return;
  ytPlayer.nextVideo();
  titleEl.textContent = "Loading…";
});
