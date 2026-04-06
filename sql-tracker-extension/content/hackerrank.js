// HackerRank: detect accepted submission
(function () {
  const PLATFORM = "hackerrank";

  function getProblemName() {
    const match = location.pathname.match(/\/challenges\/([^/]+)/);
    return match ? match[1] : "unknown-problem";
  }

  function getSQL() {
    // CodeMirror
    const lines = document.querySelectorAll(".CodeMirror-line");
    if (lines.length) return Array.from(lines).map((l) => l.textContent).join("\n");
    return "";
  }

  const observer = new MutationObserver(() => {
    // HackerRank shows a success tick / "Congratulations" on accepted
    const success = document.querySelector(".result-state-accepted, .challenge-success-message");
    if (success) {
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
