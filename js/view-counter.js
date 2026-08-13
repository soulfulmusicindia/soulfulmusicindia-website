/**
 * SOULFUL MUSIC INDIA — BLOG VIEW COUNTER
 * ---------------------------------------
 * Shows how many times each blog post has been read.
 *
 * The site is a plain static site on GitHub Pages, so there is no server of
 * our own to keep the tally in. The count lives in a free public counter
 * service instead (see viewCounter.endpoint in js/config.js) — no account,
 * no cost, nothing to maintain.
 *
 * The same reader is only counted once every few hours (see repeatAfterHours),
 * so refreshing a page does not inflate the number.
 *
 * If the service is ever slow or unreachable, the counter simply stays
 * hidden — nothing else on the page is affected.
 */
(function () {
  var el = document.querySelector("[data-view-count]");
  if (!el) return;

  var cfg = (typeof SITE_CONFIG !== "undefined" && SITE_CONFIG.viewCounter) || {};
  if (cfg.enabled === false) return;

  var endpoint = (cfg.endpoint || "https://abacus.jasoncameron.dev").replace(/\/$/, "");
  var namespace = cfg.namespace || "soulfulmusic-in";
  var repeatAfterMs = (cfg.repeatAfterHours || 6) * 60 * 60 * 1000;

  // The post's file name doubles as its counter key: stable, readable, and
  // already unique. The service caps keys at 64 characters; our slugs are
  // generated at 60 or under, but trim anyway so nothing can 400.
  var slug = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  if (!slug || slug === "index") return;
  var key = slug.slice(0, 64);

  // "Have I already been counted for this post recently?" — kept per browser.
  // localStorage can throw in private mode, so every access is guarded.
  var stamp = "smi-view:" + key;
  var lastSeen = 0;
  try {
    lastSeen = parseInt(localStorage.getItem(stamp), 10) || 0;
  } catch (e) {}

  var isNewVisit = Date.now() - lastSeen > repeatAfterMs;
  var url = endpoint + "/" + (isNewVisit ? "hit" : "get") + "/" + namespace + "/" + key;

  fetch(url, { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("counter unavailable");
      return res.json();
    })
    .then(function (data) {
      if (typeof data.value !== "number") throw new Error("no count returned");

      if (isNewVisit) {
        try {
          localStorage.setItem(stamp, String(Date.now()));
        } catch (e) {}
      }

      var num = el.querySelector("[data-view-count-number]") || el;
      num.textContent = data.value.toLocaleString("en-IN");

      var label = el.querySelector("[data-view-count-label]");
      if (label) label.textContent = data.value === 1 ? "read" : "reads";

      el.hidden = false;
    })
    .catch(function () {
      // Counter stays hidden. A missing number is better than a broken one.
    });
})();
