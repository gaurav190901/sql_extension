// HackerRank: save SQL when the success ("congrats") panel appears.
(function () {
  const PLATFORM = "hackerrank";
  const seenSuccessNodes = new WeakSet();
  const savedThisPage = new Set(); // challenge slugs saved since last route change

  function getProblemName() {
    const match = location.pathname.match(/\/challenges\/([^/]+)/);
    return match ? match[1] : null;
  }

  function selectedLanguageText() {
    const el = document.querySelector(
      ".select-language .css-1hwfws3, .select-language [class*='singleValue'], [data-automation='language-select']"
    );
    return el ? el.textContent.trim() : "";
  }

  // Monaco only renders visible lines, so this is a last resort and may be truncated.
  function scrapeVisibleLines() {
    const viewLines = document.querySelector(".view-lines");
    if (!viewLines) return "";
    return Array.from(viewLines.querySelectorAll(".view-line"))
      .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top))
      .map((l) => l.innerText.replace(/ /g, " "))
      .join("\n");
  }

  async function trySave() {
    const name = getProblemName();
    if (!name || savedThisPage.has(name)) return;

    let { code, language } = await getEditorCode();
    if (!code.trim()) {
      code = scrapeVisibleLines();
      if (code.trim()) console.warn("[SQL Tracker] Using DOM scrape; long queries may be truncated");
    }
    if (!code.trim()) {
      console.warn("[SQL Tracker] Could not read editor contents");
      return;
    }

    const lang = language || selectedLanguageText();
    if (lang && !isSqlLanguage(lang)) {
      console.log("[SQL Tracker] Non-SQL language (" + lang + "), skipping");
      return;
    }

    savedThisPage.add(name);
    submitSolution(PLATFORM, name, code, `https://www.hackerrank.com/challenges/${name}/problem`);
  }

  const observer = new MutationObserver(() => {
    const success = document.querySelector(".congrats-wrapper");
    if (!success || seenSuccessNodes.has(success)) return;
    seenSuccessNodes.add(success);
    trySave();
  });

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    onRouteChange(() => savedThisPage.clear());
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
