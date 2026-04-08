// SQLZoo: detect correct answer and extract SQL
(function () {
  const PLATFORM = "sqlzoo";

  function getProblemName() {
    const title = document.querySelector("h1, h2");
    return title
      ? title.textContent.trim().replace(/[^a-z0-9 ]/gi, "").replace(/\s+/g, "-").toLowerCase()
      : "unknown-problem";
  }

  function getSQL() {
    const textarea = document.querySelector("textarea.sql, #sql, textarea[name='sql']");
    if (textarea) return textarea.value;
    const pre = document.querySelector("pre.sql");
    if (pre) return pre.textContent;
    return "";
  }

  const observer = new MutationObserver(() => {
    // SQLZoo shows a green "Correct answer" message
    const correct = document.querySelector(".correct, .answer-correct");
    if (correct && correct.textContent.toLowerCase().includes("correct")) {
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
