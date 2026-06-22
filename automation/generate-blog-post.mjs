/**
 * AUTO BLOG WRITER — Soulful Music India
 * -----------------------------------------
 * What this does, in plain terms:
 * 1. Checks your YouTube playlist for any video not yet blogged about.
 * 2. For each new one, asks Claude (Anthropic API) to write an original,
 *    SEO-friendly article about it.
 * 3. Saves that article as a real page in /blog, AND rebuilds blog/index.html
 *    and sitemap.xml so the new post is actually discoverable — not just
 *    sitting at a URL nobody links to.
 *
 * This script does nothing by itself — it's run automatically on a
 * schedule by the GitHub Action in .github/workflows/auto-update.yml.
 * It needs two secrets set in your GitHub repo settings before it will work:
 *   YOUTUBE_API_KEY
 *   ANTHROPIC_API_KEY
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PLAYLIST_ID = "PLrF5Xs7nzfl8srrWmcVcz9dclFK4NSpQ9";
const MANIFEST_PATH = path.join(ROOT, "data", "published-videos.json");
const BLOG_DIR = path.join(ROOT, "blog");
const SITE_URL = "https://soulfulmusic.in";

// The two hand-written posts from launch — kept in the index alongside
// everything the automation writes from here on.
const HARDCODED_POSTS = [
  {
    slug: "radhe-radhe-soulful-krishna-bhajan",
    title: 'The Meaning Behind "Radhe Radhe"',
    eyebrow: "Krishna",
    thumbnail: thumbnailFor("482udqQzgeI"),
    excerpt: "Why repeating Radha's name is considered among the purest forms of Krishna bhakti.",
    publishedAt: "2026-01-01T00:00:00Z"
  },
  {
    slug: "so-humm-return-to-stillness",
    title: 'What "So Humm" Actually Means',
    eyebrow: "Meditation",
    thumbnail: null,
    excerpt: "A short meditation mantra with roots in the Upanishads, and how to use it.",
    publishedAt: "2026-01-01T00:00:00Z"
  }
];

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

function guessCategory(title) {
  const t = title.toLowerCase();
  if (t.includes("krishna") || t.includes("radha") || t.includes("kanha") || t.includes("govind") || t.includes("banke") || t.includes("nandalala")) return "Krishna";
  if (t.includes("shiva") || t.includes("shambho") || t.includes("mahadev") || t.includes("kedarnath")) return "Shiva";
  if (t.includes("hanuman")) return "Hanuman";
  if (t.includes("ganesh") || t.includes("ganpati")) return "Ganesh";
  if (t.includes("aarti")) return "Aarti";
  return "Meditation";
}

function excerptFrom(bodyHTML) {
  const text = bodyHTML.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 140 ? text.slice(0, 140).trim() + "…" : text;
}

function thumbnailFor(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

async function writeArticleWithClaude(video) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");

  const prompt = `Write an original, SEO-friendly blog article (500-700 words) about the devotional/meditation video titled "${video.title}".
Context from the video's own description (for background only — do not copy it, write entirely fresh prose):
"""${video.description}"""

Requirements:
- First, write a short, human, editorial article title — NOT the video title. It should read like a real blog headline about the meaning or theme (e.g. for a video called "HAR HAR SHAMBHO | Powerful Shiva Chant", a good article title would be something like "The Meaning Behind Har Har Shambho" or "Why Devotees Chant Har Har Shambho"). Keep it under 60 characters.
- Then write the article body: plain, warm, accessible English for a general devotional/spiritual audience.
- The FIRST sentence of the body must directly answer "what does this mean" or "what is this" in one clear, standalone sentence — no scene-setting or story before it. This sentence should make sense even with zero other context. After that direct answer, you can move into narrative, history, or color.
- Include the meaning/significance of the deity, mantra, or practice involved.
- Include practical guidance on when/how someone might use this track (puja, meditation, festivals, etc).
- Structure the body with 2-4 <h2> subheadings.
- Each section should lead with its own direct one-sentence answer before elaborating — write so each section could be read on its own and still make sense.
- Do not invent specific scriptural quotations or citations.
- Finally, write exactly 3 short FAQ-style question-and-answer pairs a real person might ask about this topic (e.g. "What does X mean?", "When should I chant X?"). Answers must be 1-2 plain sentences each, self-contained, no fluff.

Output format — exactly this, nothing else before or after:
TITLE: <the article title, plain text, no quotes, no HTML>
---
<the article body as clean HTML using only <p> and <h2> tags, no markdown, no wrapper tags>
---FAQ---
Q: <question 1>
A: <answer 1>
Q: <question 2>
A: <answer 2>
Q: <question 3>
A: <answer 3>`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1700,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
  const data = await res.json();
  const raw = data.content.map(b => b.text || "").join("\n").trim();

  const titleMatch = raw.match(/^TITLE:\s*(.+?)\s*\n---\s*\n([\s\S]+?)\n---FAQ---\n([\s\S]+)$/);
  if (!titleMatch) {
    // Fallback: if the model didn't follow the format exactly, use the
    // video title and skip FAQ rather than fail the whole run.
    return { blogTitle: video.title, bodyHTML: raw, faqItems: [] };
  }

  const faqBlock = titleMatch[3].trim();
  const faqItems = [];
  const qaRegex = /Q:\s*(.+?)\s*\nA:\s*(.+?)(?=\n\s*Q:|$)/gs;
  let m;
  while ((m = qaRegex.exec(faqBlock)) !== null) {
    faqItems.push({ question: m[1].trim(), answer: m[2].trim() });
  }

  return { blogTitle: titleMatch[1].trim(), bodyHTML: titleMatch[2].trim(), faqItems };
}

function navAndFooter() {
  return {
    nav: `<nav class="nav">
  <div class="wrap">
    <a href="../index.html" class="nav-brand"><img src="../assets/logo.png" alt="Soulful Music India logo">Soulful Music India</a>
    <ul class="nav-links">
      <li><a href="../index.html#videos">Music</a></li>
      <li><a href="../index.html#about">About</a></li>
      <li><a href="index.html">Blog</a></li>
    </ul>
    <div class="nav-right">
      <a class="nav-cta" href="https://www.youtube.com/@soulfulmusicindia?sub_confirmation=1" target="_blank" rel="noopener">Subscribe</a>
      <button class="nav-toggle" id="nav-toggle" aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>
      </button>
    </div>
  </div>
</nav>`,
    footer: `<footer>
  <div class="wrap">
    <div class="footer-grid">
      <a href="../index.html" class="footer-brand"><img src="../assets/logo.png" alt="Soulful Music India logo">Soulful Music India</a>
      <div class="footer-social">
        <a href="https://www.youtube.com/@soulfulmusicindia" target="_blank" rel="noopener" aria-label="YouTube">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.6s-.2-1.6-.9-2.3c-.8-.9-1.8-.9-2.2-1C17.6 3 12 3 12 3h0s-5.6 0-8.4.3c-.4 0-1.4.1-2.2 1-.7.7-.9 2.3-.9 2.3S0 8.5 0 10.4v1.9c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.8.9 2 .9 2.5 1 1.8.2 7.7.3 7.7.3s5.6 0 8.4-.3c.4 0 1.4-.1 2.2-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8v-1.9c0-1.9-.2-3.8-.2-3.8zM9.5 14.9V7.9l6.3 3.5-6.3 3.5z"/></svg>
        </a>
        <a href="https://www.instagram.com/soulfulmusicindia" target="_blank" rel="noopener" aria-label="Instagram">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>
        </a>
        <a href="https://www.facebook.com/profile.php?id=61590270577646" target="_blank" rel="noopener" aria-label="Facebook">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.2h2.4l.4-2.8h-2.8V9.1c0-.8.2-1.4 1.4-1.4h1.5V5.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.9H7.8v2.8h2.4V21z"/></svg>
        </a>
      </div>
    </div>
  </div>
</footer>
<script src="../js/config.js"></script>
<script src="../js/ambient-player.js"></script>`
  };
}

function followCTA() {
  return `<div class="article-follow">
    <p>Enjoyed this? Follow Soulful Music India for more.</p>
    <div class="footer-social" style="justify-content:center;">
      <a href="https://www.instagram.com/soulfulmusicindia" target="_blank" rel="noopener" aria-label="Instagram">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>
      </a>
      <a href="https://www.facebook.com/profile.php?id=61590270577646" target="_blank" rel="noopener" aria-label="Facebook">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.2h2.4l.4-2.8h-2.8V9.1c0-.8.2-1.4 1.4-1.4h1.5V5.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.9H7.8v2.8h2.4V21z"/></svg>
      </a>
    </div>
  </div>`;
}

function faqSectionHTML(faqItems) {
  if (!faqItems || faqItems.length === 0) return "";
  const items = faqItems.map(f => `
    <div class="faq-item">
      <h3>${f.question}</h3>
      <p>${f.answer}</p>
    </div>`).join("");
  return `<div class="article-faq">
    <h2>Common questions</h2>
    ${items}
  </div>`;
}

function faqSchema(faqItems) {
  if (!faqItems || faqItems.length === 0) return "";
  return `<script type="application/ld+json">
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":${JSON.stringify(
    faqItems.map(f => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer }
    }))
  )}}
</script>`;
}

function buildPageHTML({ blogTitle, videoTitle, slug, bodyHTML, videoId, thumbnail, faqItems }) {
  const { nav, footer } = navAndFooter();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${blogTitle} | Soulful Music India</title>
<link rel="canonical" href="${SITE_URL}/blog/${slug}.html">
<link rel="icon" href="../assets/logo.png">
<meta property="og:image" content="${thumbnail}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/style.css">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":${JSON.stringify(blogTitle)},"image":"${thumbnail}","publisher":{"@type":"Organization","name":"Soulful Music India"},"mainEntityOfPage":"${SITE_URL}/blog/${slug}.html"}
</script>
${faqSchema(faqItems)}
</head>
<body>
${nav}
<section class="article-header">
  <div class="wrap">
    <h1>${blogTitle}</h1>
  </div>
</section>
<article class="article-body">
  <a class="article-back" href="index.html">← Back to blog</a>
  <div class="article-cover"><img src="${thumbnail}" alt="${videoTitle}" loading="lazy"></div>
  ${bodyHTML}
  ${faqSectionHTML(faqItems)}
  <div class="article-video"><iframe src="https://www.youtube.com/embed/${videoId}" title="${videoTitle}" allowfullscreen></iframe></div>
  ${followCTA()}
</article>
${footer}
</body>
</html>`;
}

function buildBlogIndexHTML(posts) {
  const { nav, footer } = navAndFooter();
  const cards = posts.map(p => `
      <a class="blog-card" href="${p.slug}.html">
        <div class="blog-card-thumb">
          ${p.thumbnail
            ? `<img src="${p.thumbnail}" alt="${p.title}" loading="lazy">`
            : `<div class="thumb-placeholder">🪔</div>`}
        </div>
        <div class="blog-card-body">
          <span class="eyebrow">${p.eyebrow}</span>
          <h3>${p.title}</h3>
          <p>${p.excerpt}</p>
        </div>
      </a>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blog | Soulful Music India</title>
<meta name="description" content="The meaning, history and feeling behind every bhajan, mantra and meditation from Soulful Music India.">
<link rel="canonical" href="${SITE_URL}/blog/index.html">
<link rel="icon" href="../assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,500;0,600;1,500&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/style.css">
</head>
<body>
${nav}
<section class="article-header">
  <div class="wrap">
    <span class="eyebrow">Blog</span>
    <h1>The meaning behind the music</h1>
    <p class="article-meta">A new article for every bhajan, mantra and meditation — added automatically with each release.</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="blog-index-grid" id="blog-index-grid">${cards}
    </div>
  </div>
</section>
${footer}
</body>
</html>`;
}

function buildSitemap(posts) {
  const urls = [
    { loc: `${SITE_URL}/`, priority: "1.0" },
    { loc: `${SITE_URL}/blog/index.html`, priority: "0.8" },
    ...posts.map(p => ({ loc: `${SITE_URL}/blog/${p.slug}.html`, priority: "0.6" }))
  ];
  const body = urls.map(u => `  <url>\n    <loc>${u.loc}</loc>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function run() {
  const videos = await getPlaylistVideos();
  const manifest = await loadManifest();
  const publishedIds = new Set(manifest.published.map(p => p.id));
  const newVideos = videos.filter(v => !publishedIds.has(v.id));

  for (const video of newVideos) {
    console.log(`Writing article for: ${video.title}`);
    const slug = slugify(video.title);
    const thumbnail = thumbnailFor(video.id);
    const { blogTitle, bodyHTML, faqItems } = await writeArticleWithClaude(video);
    const html = buildPageHTML({ blogTitle, videoTitle: video.title, slug, bodyHTML, videoId: video.id, thumbnail, faqItems });

    await mkdir(BLOG_DIR, { recursive: true });
    await writeFile(path.join(BLOG_DIR, `${slug}.html`), html);

    manifest.published.push({
      id: video.id,
      slug,
      title: blogTitle,
      thumbnail,
      eyebrow: guessCategory(video.title),
      excerpt: excerptFrom(bodyHTML),
      publishedAt: video.publishedAt
    });
  }

  if (newVideos.length > 0) {
    await saveManifest(manifest);
  }

  // Always rebuild the blog index and sitemap — even with zero new videos,
  // since this also keeps sort order correct any time the template logic
  // changes (without needing to wait for a new upload).
  const manifestPosts = manifest.published.filter(
    p => !HARDCODED_POSTS.some(h => h.slug === p.slug)
  );
  const allPosts = [...HARDCODED_POSTS, ...manifestPosts].sort(
    (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );
  await writeFile(path.join(BLOG_DIR, "index.html"), buildBlogIndexHTML(allPosts));
  await writeFile(path.join(ROOT, "sitemap.xml"), buildSitemap(allPosts));

  console.log(`Done. Added ${newVideos.length} new article(s) and rebuilt the blog index + sitemap.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
