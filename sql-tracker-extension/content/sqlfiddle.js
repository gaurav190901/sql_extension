// SQLFiddle: detect query run and save SQL
(function () {
  const PLATFORM = "sqlfiddle";
  let lastSaved = "";

  function getProblemName() {
    // SQLFiddle doesn't have problem names — use page title or timestamp
    const title = document.title.replace("SQL Fiddle", "").trim().replace(/[^a-z0-9 ]/gi, "").trim();
    return title || `fiddle-${Date.now()}`;
  }

  function getSQL() {
    const cm = getCodeMirrorValue();
    if (cm.trim()) return cm;
    const ta = document.querySelector("#query_sql, textarea[name='query'], textarea");
    if (ta && ta.value.trim()) return ta.value;
    return "";
  }

  // Watch for successful result table appearing
  const observer = new MutationObserver(() => {
    const resultTable = document.querySelector(".results table, #query_results table, [class*='result'] table");
    if (resultTable) {
      const sql = getSQL();
      if (sql && sql !== lastSaved) {
        lastSaved = sql;
        submitSolution(PLATFORM, getProblemName(), sql);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
