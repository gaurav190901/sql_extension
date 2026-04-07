// DB Fiddle: detect successful query execution
(function () {
  const PLATFORM = "db-fiddle";
  let lastSaved = "";

  function getProblemName() {
    const title = document.title.replace("DB Fiddle", "").trim().replace(/[^a-z0-9 ]/gi, "").trim();
    return title || `fiddle-${Date.now()}`;
  }

  function getSQL() {
    // DB Fiddle uses CodeMirror
    const cm = getCodeMirrorValue();
    if (cm.trim()) return cm;
    const ta = document.querySelector("textarea");
    if (ta && ta.value.trim()) return ta.value;
    return "";
  }

  const observer = new MutationObserver(() => {
    // DB Fiddle shows results in a table when query succeeds
    const resultEl = document.querySelector(".result-table, .output table, [class*='result'] table");
    if (resultEl) {
      const sql = getSQL();
      if (sql && sql !== lastSaved) {
        lastSaved = sql;
        submitSolution(PLATFORM, getProblemName(), sql);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
