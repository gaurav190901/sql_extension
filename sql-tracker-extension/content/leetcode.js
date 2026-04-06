// LeetCode: detect accepted submission and extract SQL
(function () {
  const PLATFORM = "leetcode";

  function getProblemName() {
    // e.g. /problems/employees-earning-more-than-their-managers/
    const match = location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1] : "unknown-problem";
  }

  function getSQL() {
    // CodeMirror editor
    const lines = document.querySelectorAll(".CodeMirror-line");
    if (lines.length) return Array.from(lines).map((l) => l.textContent).join("\n");
    // Monaco editor fallback
    const monaco = document.querySelector(".view-lines");
    if (monaco) return Array.from(monaco.querySelectorAll(".view-line")).map((l) => l.textContent).join("\n");
    return "";
  }

  // Watch for "Accepted" result banner
  const observer = new MutationObserver(() => {
    const accepted = document.querySelector('[data-e2e-locator="submission-result"]');
    if (accepted && accepted.textContent.trim().toLowerCase() === "accepted") {
      const sql = getSQL();
      const name = getProblemName();
      if (sql) {
        submitSolution(PLATFORM, name, sql);
        observer.disconnect();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
