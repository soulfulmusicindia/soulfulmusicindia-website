# Soulful Music India — Website

## What's done

- Full homepage, video gallery (with category filters: Krishna, Shiva, Hanuman, Ganesh, Meditation, Aarti), about section, and blog — built around your mandala logo.
- 19 tracks from your playlist loaded as starting content.
- SEO basics: meta tags, sitemap.xml, robots.txt, and structured data (Schema.org) so Google understands this as a music/video site.
- 2 sample blog posts written, showing the format the automation will follow.
- Automation scripts written and ready (`automation/`, `.github/workflows/`) — they just need two keys before they switch on.

## What's NOT live yet (needs your action)

The site works right now as a static preview. Two things need to happen before it's a real, automated website:

### Step 1 — Get a YouTube Data API key (free)
This lets the site pull your video list live, automatically, forever.
1. Go to https://console.cloud.google.com
2. Create a new project (any name, e.g. "Soulful Music India")
3. Go to **APIs & Services → Library**, search **YouTube Data API v3**, click **Enable**
4. Go to **APIs & Services → Credentials → Create Credentials → API key**
5. Copy the key
6. Paste it into `js/config.js`, in the `youtubeApiKey: ""` line

### Step 2 — Get an Anthropic API key (small pay-as-you-go cost)
This lets the automation write a real blog article for every new upload.
1. Go to https://console.anthropic.com
2. Create an account, add a small amount of credit (a few dollars covers a very long time at this volume)
3. Go to **API Keys → Create Key**
4. Copy it — you won't paste this one into a file; it goes into GitHub instead (next step)

### Step 3 — Add both keys to GitHub as "secrets"
1. Push this project to your GitHub account (`github.com/soulfulmusicindia`) — happy to walk you through this when you're ready
2. In your repo, go to **Settings → Secrets and variables → Actions**
3. Add two secrets: `YOUTUBE_API_KEY` and `ANTHROPIC_API_KEY`, pasting in the values from Steps 1 and 2

### Step 4 — Host it live
1. Go to https://app.netlify.com, sign up free, choose "Import from GitHub"
2. Pick this repository
3. Click Deploy — Netlify gives you a live URL in about a minute
4. In Netlify's domain settings, connect `soulfulmusic.in` once you're ready

Once all four steps are done: any video you add to your playlist appears on the site automatically, and a fresh blog post gets written and published for it within 6 hours, with zero further effort from you.

## Files at a glance

```
index.html              → homepage
css/style.css           → all styling
js/config.js            → the one file you edit by hand (API key, links)
js/main.js              → loads videos, live or fallback
data/videos.json         → fallback video list (used until API key is added)
blog/                    → blog posts + index
automation/              → the auto-blog-writer script
.github/workflows/       → the schedule that runs it automatically
```
