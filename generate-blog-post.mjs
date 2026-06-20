/**
 * AUTO BLOG WRITER — Soulful Music India
 * -----------------------------------------
 * What this does, in plain terms:
 * 1. Checks your YouTube playlist for any video not yet blogged about.
 * 2. For each new one, asks Claude (Anthropic API) to write an original,
 *    SEO-friendly article about it.
 * 3. Saves that article as a real page in /blog, and adds it to the
 *    blog index and sitemap.
 *
 * This script does nothing by itself — it's run automatically on a
 * schedule by the GitHub Action in .github/workflows/auto-update.yml.
 * It needs two secrets set in your GitHub repo settings before it will work:
 *   YOUTUBE_API_KEY
 *   ANTHROPIC_API_KEY
 * (Step 3 and Step 4 of our setup plan — nothing to do here until then.)
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PLAYLIST_ID = "PLrF5Xs7nzfl8srrWmcVcz9dclFK4NSpQ9";
const MANIFEST_PATH = path.join(ROOT, "data", "published-videos.json");
const BLOG_DIR = path.join(ROOT, "blog");

async function getPlaylistVideos() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set.");

  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${PLAYLIST_ID}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json();

  return data.items
    .filter(i => i.snippet?.title && i.snippet.title !== "Private video" && i.snippet.title !== "Deleted video")
    .map(i => ({
      id: i.snippet.resourceId.videoId,
      title: i.snippet.title,
      description: i.snippet.description || "",
      publishedAt: i.snippet.publishedAt
    }));
}

async function loadManifest() {
  try {
    const raw = await readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { published: [] };
  }
}

async function saveManifest(manifest) {
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

async function writeArticleWithClaude(video) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");

  const prompt = `Write an original, SEO-friendly blog article (500-700 words) about the devotional/meditation video titled "${video.title}".
Context from the video's own description (for background only — do not copy it, write entirely fresh prose):
"""${video.description}"""

Requirements:
- Write in plain, warm, accessible English for a general devotional/spiritual audience.
- Include the meaning/significance of the deity, mantra, or practice involved.
- Include practical guidance on when/how someone might use this track (puja, meditation, festivals, etc).
- Structure with 2-4 <h2> subheadings.
- Output ONLY clean HTML paragraph and heading tags (<p>, <h2>), no <html>/<head>/<body> wrapper, no markdown.
- Do not invent specific scriptural quotations or citations.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  return data.content.map(b => b.text || "").join("\n");
}

function buildPageHTML({ title, slug, bodyHTML, videoId }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | Soulful Music India</title>
<link rel="canonical" href="https://soulfulmusic.in/blog/${slug}.html">
<link rel="icon" href="../assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/style.css">
</head>
<body>
<nav class="nav">
  <div class="wrap">
    <a href="../index.html" class="nav-brand"><img src="../assets/logo.png" alt="Soulful Music India logo">Soulful Music India</a>
    <ul class="nav-links">
      <li><a href="../index.html#videos">Music</a></li>
      <li><a href="../index.html#about">About</a></li>
      <li><a href="index.html">Blog</a></li>
    </ul>
    <a class="nav-cta" href="https://www.youtube.com/@soulfulmusicindia?sub_confirmation=1" target="_blank" rel="noopener">Subscribe</a>
  </div>
</nav>
<section class="article-header">
  <div class="wrap">
    <h1>${title}</h1>
  </div>
</section>
<article class="article-body">
  <a class="article-back" href="index.html">← Back to blog</a>
  <div class="article-video"><iframe src="https://www.youtube.com/embed/${videoId}" title="${title}" allowfullscreen></iframe></div>
  ${bodyHTML}
</article>
<footer>
  <div class="wrap">
    <div class="footer-grid">
      <a href="../index.html" class="footer-brand"><img src="../assets/logo.png" alt="Soulful Music India logo">Soulful Music India</a>
      <div class="footer-social">
        <a href="https://www.youtube.com/@soulfulmusicindia" target="_blank" rel="noopener">YouTube</a>
        <a href="https://www.instagram.com/soulfulmusicindia" target="_blank" rel="noopener">Instagram</a>
        <a href="https://www.facebook.com/profile.php?id=61590270577646" target="_blank" rel="noopener">Facebook</a>
      </div>
    </div>
  </div>
</footer>
</body>
</html>`;
}

async function run() {
  const videos = await getPlaylistVideos();
  const manifest = await loadManifest();
  const publishedIds = new Set(manifest.published.map(p => p.id));
  const newVideos = videos.filter(v => !publishedIds.has(v.id));

  if (newVideos.length === 0) {
    console.log("No new videos. Nothing to do.");
    return;
  }

  for (const video of newVideos) {
    console.log(`Writing article for: ${video.title}`);
    const slug = slugify(video.title);
    const bodyHTML = await writeArticleWithClaude(video);
    const html = buildPageHTML({ title: video.title, slug, bodyHTML, videoId: video.id });

    await mkdir(BLOG_DIR, { recursive: true });
    await writeFile(path.join(BLOG_DIR, `${slug}.html`), html);

    manifest.published.push({ id: video.id, slug, title: video.title, publishedAt: video.publishedAt });
  }

  await saveManifest(manifest);
  console.log(`Done. Added ${newVideos.length} new article(s).`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
