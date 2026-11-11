// Shared helpers for content scripts (isolated world).

const SQL_LANG_RE = /sql|oracle|db2|tsql|plsql/i;

function isSqlLanguage(lang) {
  return SQL_LANG_RE.test(lang || "");
}

// Problem URL without query string / submission path, e.g.
// https://leetcode.com/problems/foo/submissions/123/?envType=x -> https://leetcode.com/problems/foo/
function canonicalUrl() {
  const path = location.pathname.replace(/\/(submissions|description|solutions|editorial|problem|leaderboard|forum)(\/.*)?$/, "/");
  return location.origin + path;
}

// Ask the MAIN-world bridge for the current editor contents.
function getEditorCode(timeoutMs = 2000) {
  return new Promise((resolve) => {
    let done = false;
    function handler(e) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener("sql-tracker-code", handler);
      try {
        resolve(JSON.parse(e.detail));
      } catch {
        resolve({ code: "", language: "" });
      }
    }
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      window.removeEventListener("sql-tracker-code", handler);
      resolve({ code: "", language: "" });
    }, timeoutMs);
    window.addEventListener("sql-tracker-code", handler);
    window.dispatchEvent(new CustomEvent("sql-tracker-get-code"));
  });
}

// Sends a solved solution to the background service worker.
function submitSolution(platform, problemName, sql, url = canonicalUrl()) {
  chrome.runtime.sendMessage(
    { type: "PUSH_SOLUTION", platform, problemName, sql, url },
    (res) => {
      if (chrome.runtime.lastError) {
        showToast(`✗ SQL Tracker: ${chrome.runtime.lastError.message}`, true);
        return;
      }
      if (res?.ok && res.unchanged) {
        showToast(`✓ Already saved (no changes): ${problemName}`);
      } else if (res?.ok) {
        showToast(`✓ Saved to GitHub: ${problemName}`);
      } else {
        showToast(`✗ Failed to save: ${res?.error || "unknown error"}`, true);
      }
    }
  );
}

function showToast(message, isError = false) {
  const existing = document.getElementById("sql-tracker-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "sql-tracker-toast";
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    maxWidth: "420px",
    background: isError ? "#c0392b" : "#27ae60",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "system-ui, sans-serif",
    zIndex: "2147483647",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    transition: "opacity 0.4s",
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, isError ? 6000 : 3500);
}

// Calls `cb` whenever the SPA route changes (pushState/popstate/polling fallback).
function onRouteChange(cb) {
  let last = location.pathname;
  const check = () => {
    if (location.pathname !== last) {
      last = location.pathname;
      cb(last);
    }
  };
  window.addEventListener("popstate", check);
  setInterval(check, 1000);
}
