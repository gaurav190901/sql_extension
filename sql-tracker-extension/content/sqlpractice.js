// sql-practice.com: intercept Vue state to detect correct answer
(function () {
  const PLATFORM = "sql-practice";
  let lastSaved = "";

  function getProblemName() {
    // Question title shown in the problem panel
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
        return el.textContent.trim().replace(/[^a-z0-9 ]/gi, "").replace(/\s+/g, "-").toLowerCase();
      }
    }
    // Fallback: question number from any visible badge/number
    const badge = document.querySelector("[class*='question-number'], [class*='questionNumber']");
    if (badge) return `question-${badge.textContent.trim()}`;
    return `question-${Date.now()}`;
  }

  function getSQL() {
    const cm = document.querySelector(".CodeMirror");
    if (cm && cm.CodeMirror) return cm.CodeMirror.getValue();
    const lines = document.querySelectorAll(".CodeMirror-line");
    if (lines.length) return Array.from(lines).map((l) => l.textContent).join("\n");
    const ta = document.querySelector("textarea");
    if (ta) return ta.value;
    return "";
  }

  // Intercept console.log to catch the "true" validation result
  // The site logs: "Before Validate" then "true"/"false"
  const originalLog = console.log.bind(console);
  let expectingResult = false;

  console.log = function (...args) {
    originalLog(...args);

    const msg = args[0];

    if (typeof msg === "string" && msg === "Before Validate") {
      expectingResult = true;
      return;
    }

    if (expectingResult) {
      expectingResult = false;
      if (args[0] === true) {
        const sql = getSQL();
        const name = getProblemName();
        if (sql && sql !== lastSaved) {
          lastSaved = sql;
          submitSolution(PLATFORM, name, sql);
        }
      }
    }
  };
})();
