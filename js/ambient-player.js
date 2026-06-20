/**
 * AMBIENT MUSIC BAR — Soulful Music India
 * -----------------------------------------
 * A tap-to-play bar that streams straight from the live playlist.
 * Nothing plays until the visitor taps the button themselves — this is
 * deliberate: browsers block unmuted autoplay anyway, and a sound a
 * visitor chose to start feels welcoming instead of jarring.
 */

let ytPlayer = null;
let isPlaying = false;

const bar = document.getElementById("ambient-bar");
const toggleBtn = document.getElementById("ambient-toggle");
const nextBtn = document.getElementById("ambient-next");
const closeBtn = document.getElementById("ambient-close");
const titleEl = document.getElementById("ambient-title");
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
    updateTitle();
  } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    updateIcon();
  }
}

function updateTitle() {
  try {
    const data = ytPlayer.getVideoData();
    if (data?.title) titleEl.textContent = data.title;
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

nextBtn.addEventListener("click", () => {
  if (!ytPlayer || typeof ytPlayer.nextVideo !== "function") return;
  ytPlayer.nextVideo();
  titleEl.textContent = "Loading…";
});

closeBtn.addEventListener("click", () => {
  if (ytPlayer && typeof ytPlayer.pauseVideo === "function") ytPlayer.pauseVideo();
  bar.classList.add("hidden");
});
