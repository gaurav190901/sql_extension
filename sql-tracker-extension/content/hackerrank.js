// HackerRank: detect accepted submission
(function () {
  const PLATFORM = "hackerrank";
  let saved = false;

  function getProblemName() {
    const match = location.pathname.match(/\/challenges\/([^/]+)/);
    return match ? match[1] : "unknown-problem";
  }

  function getSQL() {
    // HackerRank uses CodeMirror — grab instance directly
    const sql = getCodeMirrorValue();
    if (sql.trim()) return sql;
    return "";
  }

  const observer = new MutationObserver(() => {
    if (saved) return;
    const success = document.querySelector(".result-state-accepted, .challenge-success-message, [class*='statusAccepted']");
    if (success) {
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
