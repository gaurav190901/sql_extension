// LeetCode: detect accepted submission and extract SQL
(function () {
  const PLATFORM = "leetcode";
  let lastSavedProblem = "";

  function getProblemName() {
    const match = location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1] : null;
  }

  function getSQL() {
    // LeetCode uses Monaco — grab model value directly
    try {
      if (typeof monaco !== "undefined") {
        const models = monaco.editor.getModels();
        if (models.length) {
          const val = models[0].getValue();
          if (val.trim()) return val;
        }
      }
    } catch {}
    // Fallback: scrape view lines
    const viewLines = document.querySelector(".view-lines");
    if (viewLines) {
      return Array.from(viewLines.querySelectorAll(".view-line"))
        .map((l) => l.innerText)
        .join("\n");
    }
    return "";
  }

  function checkForAccepted() {
    const name = getProblemName();
    if (!name || name === lastSavedProblem) return;

    // Primary selector used by LeetCode's test result panel
    const result = document.querySelector('[data-e2e-locator="submission-result"]');
    if (result && result.textContent.trim().toLowerCase() === "accepted") {
      const sql = getSQL();
      if (sql.trim()) {
        lastSavedProblem = name;
        submitSolution(PLATFORM, name, sql);
      }
      return;
    }

    // Fallback: look for any element with text "Accepted" in the result area
    const allEls = document.querySelectorAll(
      '[class*="result"] span, [class*="status"] span, [class*="Result"] span'
    );
    for (const el of allEls) {
      if (el.textContent.trim().toLowerCase() === "accepted") {
        const sql = getSQL();
        if (sql.trim()) {
          lastSavedProblem = name;
          submitSolution(PLATFORM, name, sql);
        }
        return;
      }
    }
  }

  // LeetCode is a SPA — re-init observer on URL changes
  let currentPath = location.pathname;
  const observer = new MutationObserver(() => {
    // Detect navigation
    if (location.pathname !== currentPath) {
      currentPath = location.pathname;
      lastSavedProblem = ""; // reset on new problem
    }
    checkForAccepted();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
