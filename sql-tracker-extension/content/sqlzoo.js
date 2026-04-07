// SQLZoo: detect correct answer and extract SQL
(function () {
  const PLATFORM = "sqlzoo";
  let saved = false;

  function getProblemName() {
    // Try multiple heading selectors — SQLZoo has changed its DOM over time
    const heading = document.querySelector("h1, h2, .question-title, [class*='title']");
    if (heading && heading.textContent.trim()) {
      return heading.textContent.trim()
        .replace(/[^a-z0-9 ]/gi, "")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .slice(0, 80);
    }
    // Fallback: use URL path
    return location.pathname.replace(/\//g, "-").replace(/^-|-$/g, "") || "unknown-problem";
  }

  function getSQL() {
    // Try CodeMirror instance first
    const cm = getCodeMirrorValue();
    if (cm.trim()) return cm;

    // SQLZoo also uses plain textareas
    const textarea = document.querySelector("textarea.sql, #sql, textarea[name='sql'], textarea");
    if (textarea && textarea.value.trim()) return textarea.value;

    const pre = document.querySelector("pre.sql");
    if (pre) return pre.textContent;

    return "";
  }

  const observer = new MutationObserver(() => {
    if (saved) return;
    // SQLZoo shows various "correct" indicators depending on version
    const correct = document.querySelector(
      ".correct, .answer-correct, [class*='correct'], .alert-success, .well.correct"
    );
    if (correct && correct.textContent.toLowerCase().includes("correct")) {
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
