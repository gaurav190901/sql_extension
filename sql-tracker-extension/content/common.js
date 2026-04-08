// Sends solved solution to background script
function submitSolution(platform, problemName, sql) {
  chrome.runtime.sendMessage(
    { type: "PUSH_SOLUTION", platform, problemName, sql },
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
