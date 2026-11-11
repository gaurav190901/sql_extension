// LeetCode: save accepted SQL submissions.
// Primary path: page-bridge.js captures the exact submitted code + language from
// LeetCode's submit/check requests. Fallback: watch the "Accepted" result banner.
(function () {
  const PLATFORM = "leetcode";
  const savedSubmissions = new Set();
  const seenResultNodes = new WeakSet();
  let lastNetworkSaveAt = 0;

  function slugFromPath() {
    const m = location.pathname.match(/\/problems\/([^/]+)/);
    return m ? m[1] : null;
  }

  function problemUrl(slug) {
    return `https://leetcode.com/problems/${slug}/`;
  }

  // ---- Primary: network capture ----
  window.addEventListener("sql-tracker-accepted", (e) => {
    let data;
    try { data = JSON.parse(e.detail); } catch { return; }
    if (!data || savedSubmissions.has(data.submissionId)) return;
    savedSubmissions.add(data.submissionId);
    lastNetworkSaveAt = Date.now();

    if (!isSqlLanguage(data.lang)) {
      console.log("[SQL Tracker] Accepted non-SQL submission (" + data.lang + "), skipping");
      return;
    }
    if (!data.code.trim()) return;
    submitSolution(PLATFORM, data.slug, data.code, problemUrl(data.slug));
  });

  // ---- Fallback: DOM result banner ----
  // Only reacts to a result node it hasn't seen before, so editing code after an
  // earlier "Accepted" never triggers a save of unsubmitted code.
  const observer = new MutationObserver(() => {
    const result = document.querySelector('[data-e2e-locator="submission-result"]');
    if (!result || seenResultNodes.has(result)) return;
    if (result.textContent.trim().toLowerCase() !== "accepted") return;
    seenResultNodes.add(result);

    // Give the network path a moment; if it already handled this, do nothing.
    setTimeout(async () => {
      if (Date.now() - lastNetworkSaveAt < 10000) return;
      const slug = slugFromPath();
      if (!slug) return;
      const { code, language } = await getEditorCode();
      if (!code.trim()) {
        console.warn("[SQL Tracker] Accepted detected but editor was empty");
        return;
      }
      if (language && !isSqlLanguage(language)) return;
      console.log("[SQL Tracker] Saving via DOM fallback");
      submitSolution(PLATFORM, slug, code, problemUrl(slug));
    }, 1500);
  });

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
