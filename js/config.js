/**
 * SOULFUL MUSIC INDIA — SITE CONFIG
 * ----------------------------------
 * This is the ONLY file you should need to touch by hand.
 * Everything else runs itself once this is filled in.
 */

const SITE_CONFIG = {
  // Paste your YouTube Data API key here once you have it (Step 3 of our setup).
  // Leave blank to keep showing the fallback list in data/videos.json.
  youtubeApiKey: "AIzaSyCekRHHJTZk0iWshJ25lGbqIiLKFbjLZ2w",

  // Your playlist ID (already filled in from the link you sent).
  playlistId: "PLrF5Xs7nzfl8srrWmcVcz9dclFK4NSpQ9",

  // How many of your most recent videos to show on the homepage.
  // The full catalogue always stays one click away on YouTube.
  homepageVideoCount: 12,

  social: {
    youtube: "https://www.youtube.com/@soulfulmusicindia",
    spotify: "https://open.spotify.com/artist/1DltOrzqeKYCFvwYXrrSKb",
    instagram: "https://www.instagram.com/soulfulmusicindia",
    facebook: "https://www.facebook.com/profile.php?id=61590270577646"
  },

  // Blog view counter. The tally is kept by a free public counter service —
  // no account, no cost, nothing to maintain. Set enabled to false and the
  // counter quietly disappears from every post. If the service ever goes
  // away, any host with the same /hit/<namespace>/<key> shape drops straight
  // in as the endpoint.
  viewCounter: {
    enabled: true,
    endpoint: "https://abacus.jasoncameron.dev",
    namespace: "soulfulmusic-in",
    repeatAfterHours: 6   // same reader isn't re-counted inside this window
  },

  siteName: "Soulful Music India",
  tagline: "Bhajans, Mantras & Meditations for the Soul",
  domain: "https://soulfulmusic.in"
};
