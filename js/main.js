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
const sortSelect = document.getElementById("sort-select");
const playerModal = document.getElementById("player-modal");
const playerFrame = document.getElementById("player-frame");
const playerClose = document.getElementById("player-close");

let allVideos = [];
let activeCategory = "All";
let activeSort = "newest";
let hasViewData = false;

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
  hasViewData = allVideos.some(v => typeof v.viewCount === "number");
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

  const videos = data.items
    .filter(item => item.snippet?.title !== "Private video" && item.snippet?.title !== "Deleted video")
   .map(item => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url,
      category: guessCategory(item.snippet.title),
      publishedAt: item.snippet.publishedAt
    }))
    .reverse(); // newest first

  await enrichWithStats(videos);
  return videos;
}

// Adds view count + duration to each video using a single batched call,
// so we can offer "Most popular" sorting and show track length.
async function enrichWithStats(videos) {
  const ids = videos.map(v => v.id).filter(Boolean);
  if (ids.length === 0) return;

  try {
    const params = new URLSearchParams({
      part: "statistics,contentDetails",
      id: ids.join(","),
      key: SITE_CONFIG.youtubeApiKey
    });
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
    if (!res.ok) throw new Error(`YouTube stats error: ${res.status}`);
    const data = await res.json();

    const byId = new Map(data.items.map(item => [item.id, item]));
    videos.forEach(v => {
      const item = byId.get(v.id);
      if (!item) return;
      v.viewCount = Number(item.statistics?.viewCount ?? 0);
      v.durationISO = item.contentDetails?.duration || "";
      v.duration = formatDuration(item.contentDetails?.duration);
    });
  } catch (err) {
    console.warn("Could not load view counts/durations:", err);
  }
}

function formatDuration(iso) {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const [, h, m, s] = match;
  const hours = Number(h || 0);
  const mins = Number(m || 0);
  const secs = Number(s || 0);
  const paddedSecs = String(secs).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(mins).padStart(2, "0")}:${paddedSecs}`;
  return `${mins}:${paddedSecs}`;
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

function renderSortOptions() {
  const options = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
    { value: "title", label: "Title (A–Z)" }
  ];
  if (hasViewData) {
    options.splice(2, 0, { value: "popular", label: "Most popular" });
  }

  sortSelect.innerHTML = options
    .map(o => `<option value="${o.value}"${o.value === activeSort ? " selected" : ""}>${o.label}</option>`)
    .join("");

  sortSelect.addEventListener("change", () => {
    activeSort = sortSelect.value;
    renderGrid();
  });
}

function sortVideos(videos) {
  const sorted = [...videos];
  switch (activeSort) {
    case "oldest":
      return sorted.reverse();
    case "popular":
      return sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    case "title":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "newest":
    default:
      return sorted;
  }
}

function renderGrid() {
  let filtered = activeCategory === "All"
    ? allVideos
    : allVideos.filter(v => v.category === activeCategory);

  filtered = sortVideos(filtered);

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

  const meta = [v.duration, formatViews(v.viewCount)].filter(Boolean).join(" · ");

  return `
    <article class="video-card" data-id="${v.id || ""}" tabindex="0">
      <div class="thumb-wrap">
        ${thumb}
        <span class="category-tag">${icon} ${v.category}</span>
        ${v.duration ? `<span class="duration-tag">${v.duration}</span>` : ""}
      </div>
      <h3>${escapeHTML(v.title)}</h3>
      ${meta ? `<p class="video-meta">${meta}</p>` : ""}
    </article>
  `;
}

function formatViews(count) {
  if (typeof count !== "number") return "";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`;
  return `${count} views`;
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
    .map((v, i) => {
      const videoObject = {
        "@type": "VideoObject",
        name: v.title,
        description: (v.description && v.description.trim()) || v.title,
        thumbnailUrl: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        contentUrl: `https://www.youtube.com/watch?v=${v.id}`,
        embedUrl: `https://www.youtube.com/embed/${v.id}`,
        uploadDate: v.publishedAt
      };
      if (v.durationISO) videoObject.duration = v.durationISO;
      return {
        "@type": "ListItem",
        position: i + 1,
        item: videoObject
      };
    });

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
  renderSortOptions();
  renderGrid();
})();
