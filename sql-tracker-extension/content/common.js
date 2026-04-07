// Sends solved solution to background script
function submitSolution(platform, problemName, sql, url = location.href) {
  chrome.runtime.sendMessage(
    { type: "PUSH_SOLUTION", platform, problemName, sql, url },
    (res) => {
      if (res?.ok) {
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
    background: isError ? "#c0392b" : "#27ae60",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: "6px",
    fontSize: "14px",
    zIndex: "999999",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    transition: "opacity 0.4s",
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Reliable CodeMirror value extraction — uses the CM instance directly
function getCodeMirrorValue() {
  // CodeMirror 5: instance attached to wrapper element
  const cmEl = document.querySelector(".CodeMirror");
  if (cmEl && cmEl.CodeMirror) return cmEl.CodeMirror.getValue();

  // Fallback: scrape rendered lines
  const lines = document.querySelectorAll(".CodeMirror-line");
  if (lines.length) return Array.from(lines).map((l) => l.innerText).join("\n");

  return "";
}

// Reliable Monaco editor value extraction
function getMonacoValue() {
  try {
    // Monaco exposes models on the global monaco object
    if (typeof monaco !== "undefined") {
      const models = monaco.editor.getModels();
      if (models.length) return models[0].getValue();
    }
  } catch {}

  // Fallback: scrape view lines
  const viewLines = document.querySelector(".view-lines");
  if (viewLines) {
    return Array.from(viewLines.querySelectorAll(".view-line"))
      .map((l) => l.innerText)
      .join("\n");
  }
  return "";
}
