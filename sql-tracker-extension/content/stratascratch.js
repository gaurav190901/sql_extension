// StrataScratch: detect accepted solution
(function () {
  const PLATFORM = "stratascratch";
  let saved = false;

  function getProblemName() {
    // URL pattern: /coding/problem-id--problem-slug/
    const match = location.pathname.match(/\/coding\/([^/]+)/);
    if (match) return match[1].replace(/^\d+--/, "");
    const heading = document.querySelector("h1, h2, [class*='title']");
    if (heading && heading.textContent.trim()) {
      return heading.textContent.trim()
        .replace(/[^a-z0-9 ]/gi, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
    }
    return "unknown-problem";
  }

  function getSQL() {
    // StrataScratch uses Monaco
    const sql = getMonacoValue();
    if (sql.trim()) return sql;
    return getCodeMirrorValue();
  }

  const observer = new MutationObserver(() => {
    if (saved) return;
    // StrataScratch shows "Correct" or a green success banner
    const success = document.querySelector(
      "[class*='correct'], [class*='success'], [class*='Correct'], [class*='passed']"
    );
    if (success && success.offsetParent !== null) {
      const sql = getSQL();
      const name = getProblemName();
      if (sql.trim()) {
        saved = true;
        submitSolution(PLATFORM, name, sql);
        observer.disconnect();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
