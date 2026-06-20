/**
 * SOULFUL MUSIC INDIA — SITE LOGIC
 * Renders the video grid (live from YouTube once an API key is added,
 * otherwise from data/videos.json), handles category filtering,
 * the in-page player, and structured data for search engines.
 */

const CATEGORY_ICONS = {
  Krishna: "🦚",
  Shiva: "🔱",
  Hanuman: "🪔",
  Ganesh: "🐘",
  Meditation: "🌀",
  Aarti: "🪷"
};

const grid = document.getElementById("video-grid");
const filterBar = document.getElementById("filter-bar");
const playerModal = document.getElementById("player-modal");
const playerFrame = document.getElementById("player-frame");
const playerClose = document.getElementById("player-close");

let allVideos = [];
let activeCategory = "All";

async function loadVideos() {
  let videos;
  if (SITE_CONFIG.youtubeApiKey) {
    try {
      videos = await fetchFromYouTube();
    } catch (err) {
      console.warn("YouTube API fetch failed, falling back to local data:", err);
    }
  }
  if (!videos) {
    const res = await fetch("data/videos.json");
    const json = await res.json();
    videos = json.videos.filter(v => v.title);
  }
  // Homepage only ever shows the top N (most recent) — the full catalogue lives on YouTube.
  allVideos = videos.slice(0, SITE_CONFIG.homepageVideoCount);
}

async function fetchFromYouTube() {
  const base = "https://www.googleapis.com/youtube/v3/playlistItems";
  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    maxResults: "50",
    playlistId: SITE_CONFIG.playlistId,
    key: SITE_CONFIG.youtubeApiKey
  });
  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();

  return data.items
    .filter(item => item.snippet?.title !== "Private video" && item.snippet?.title !== "Deleted video")
    .map(item => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url,
      category: guessCategory(item.snippet.title),
      publishedAt: item.snippet.publishedAt
    }))
    .reverse(); // newest first
}

function guessCategory(title) {
  const t = title.toLowerCase();
  if (t.includes("krishna") || t.includes("radha") || t.includes("kanha") || t.includes("govind") || t.includes("banke") || t.includes("nandalala")) return "Krishna";
  if (t.includes("shiva") || t.includes("shambho") || t.includes("mahadev") || t.includes("kedarnath")) return "Shiva";
  if (t.includes("hanuman")) return "Hanuman";
  if (t.includes("ganesh") || t.includes("ganpati")) return "Ganesh";
  if (t.includes("aarti")) return "Aarti";
  return "Meditation";
}

function renderFilters() {
  const categories = ["All", ...new Set(allVideos.map(v => v.category))];
  filterBar.innerHTML = categories
    .map(c => `<button class="filter-pill${c === activeCategory ? " active" : ""}" data-cat="${c}">${c}</button>`)
    .join("");

  filterBar.querySelectorAll(".filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderFilters();
      renderGrid();
    });
  });
}

function renderGrid() {
  const filtered = activeCategory === "All"
    ? allVideos
    : allVideos.filter(v => v.category === activeCategory);

  grid.innerHTML = filtered.map(cardHTML).join("");

  grid.querySelectorAll(".video-card").forEach(card => {
    card.addEventListener("click", () => openPlayer(card.dataset.id));
  });

  injectStructuredData(filtered);
}

function cardHTML(v) {
  const icon = CATEGORY_ICONS[v.category] || "🪔";
  const thumb = v.thumbnail || v.id
    ? `<img src="${v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}" alt="${escapeHTML(v.title)}" loading="lazy" />`
    : `<div class="thumb-placeholder">${icon}</div>`;

  return `
    <article class="video-card" data-id="${v.id || ""}" tabindex="0">
      <div class="thumb-wrap">
        ${thumb}
        <span class="category-tag">${icon} ${v.category}</span>
        ${v.duration ? `<span class="duration-tag">${v.duration}</span>` : ""}
      </div>
      <h3>${escapeHTML(v.title)}</h3>
    </article>
  `;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function openPlayer(id) {
  if (!id) return;
  playerFrame.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
  playerModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closePlayer() {
  playerModal.classList.remove("open");
  playerFrame.src = "";
  document.body.style.overflow = "";
}

playerClose.addEventListener("click", closePlayer);
playerModal.addEventListener("click", e => {
  if (e.target === playerModal) closePlayer();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closePlayer();
});

function injectStructuredData(videos) {
  const existing = document.getElementById("structured-data");
  if (existing) existing.remove();

  const itemListElement = videos
    .filter(v => v.id)
    .map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "VideoObject",
        name: v.title,
        thumbnailUrl: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        contentUrl: `https://www.youtube.com/watch?v=${v.id}`,
        embedUrl: `https://www.youtube.com/embed/${v.id}`
      }
    }));

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "structured-data";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement
  });
  document.head.appendChild(script);
}

(async function init() {
  await loadVideos();
  renderFilters();
  renderGrid();
})();
