// sql-practice.com: detect correct answer via DOM observation
(function () {
  const PLATFORM = "sql-practice";
  let lastSaved = "";

  function getProblemName() {
    const selectors = [
      ".question-title",
      ".problem-title",
      "[class*='question'] h3",
      "[class*='question'] h4",
      ".modal-title",
      "#question-title",
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        return el.textContent.trim()
          .replace(/[^a-z0-9 ]/gi, "")
          .replace(/\s+/g, "-")
          .toLowerCase();
      }
    }
    const badge = document.querySelector("[class*='question-number'], [class*='questionNumber']");
    if (badge) return `question-${badge.textContent.trim()}`;
    return `question-${Date.now()}`;
  }

  function getSQL() {
    // Try CodeMirror instance directly
    const sql = getCodeMirrorValue();
    if (sql.trim()) return sql;
    const ta = document.querySelector("textarea");
    if (ta && ta.value.trim()) return ta.value;
    return "";
  }

  // Watch for a success/correct result element appearing in the DOM
  // This replaces the fragile console.log interception
  const observer = new MutationObserver(() => {
    const successEl = document.querySelector(
      "[class*='correct'], [class*='success'], [class*='Correct'], .alert-success, [class*='rightAnswer']"
    );
    if (successEl && successEl.offsetParent !== null) {
      const sql = getSQL();
      const name = getProblemName();
      if (sql && sql !== lastSaved) {
        lastSaved = sql;
        submitSolution(PLATFORM, name, sql);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
})();
