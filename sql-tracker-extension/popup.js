const statusEl = document.getElementById("status");
const btnAuth = document.getElementById("btn-auth");
const btnLogout = document.getElementById("btn-logout");
const authSteps = document.getElementById("auth-steps");
const userCodeEl = document.getElementById("user-code");
const verifyLink = document.getElementById("verify-link");
const connectedSection = document.getElementById("connected-section");
const historyList = document.getElementById("history-list");

function setStatus(text, type = "") {
  statusEl.innerHTML = type
    ? `<span class="${type}">${text}</span>`
    : text;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function renderHistory(history) {
  if (!history.length) {
    historyList.innerHTML = '<div class="empty-history">No saves yet.</div>';
    return;
  }
  historyList.innerHTML = history.map((item) => `
    <div class="history-item">
      <span class="history-name" title="${item.problemName}">${item.problemName}</span>
      <span class="history-platform">${item.platform}</span>
      <span class="history-date">${formatDate(item.solvedAt)}</span>
    </div>
  `).join("");
}

function showAuthenticated() {
  setStatus('Status: <span class="ok">Connected to GitHub</span>');
  btnAuth.style.display = "none";
  btnLogout.style.display = "block";
  authSteps.style.display = "none";
  connectedSection.style.display = "block";

  chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (res) => {
    renderHistory(res?.history || []);
  });
}

function showUnauthenticated() {
  setStatus("Status: Not connected");
  btnAuth.style.display = "block";
  btnLogout.style.display = "none";
  authSteps.style.display = "none";
  connectedSection.style.display = "none";
}

function showPendingAuth(device) {
  setStatus("Waiting for GitHub authorization...");
  userCodeEl.textContent = device.user_code;
  verifyLink.href = device.verification_uri;
  verifyLink.textContent = device.verification_uri;
  authSteps.style.display = "block";
  btnAuth.style.display = "none";
  connectedSection.style.display = "none";
}

function checkAuthStatus() {
  chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (res) => {
    if (res.authenticated) {
      showAuthenticated();
    } else if (res.pendingAuth) {
      showPendingAuth(res.pendingAuth);
      // Keep polling every 3s while waiting so the popup updates automatically
      setTimeout(checkAuthStatus, 3000);
    } else {
      showUnauthenticated();
    }
  });
}

// Check current auth state on open
checkAuthStatus();

btnAuth.addEventListener("click", () => {
  setStatus("Starting authorization...");
  btnAuth.disabled = true;
  chrome.runtime.sendMessage({ type: "START_AUTH" }, (res) => {
    btnAuth.disabled = false;
    if (res?.ok) {
      showPendingAuth({ user_code: res.userCode, verification_uri: res.verificationUri });
    } else {
      const msg = res?.error || "Failed to start auth";
      const isProxy = msg.includes("Proxy server");
      setStatus(
        isProxy
          ? `Proxy not running. Start it with:<br><code style="font-size:10px">node proxy/server.js</code>`
          : `Error: ${msg}`,
        "error"
      );
    }
  });
});

btnLogout.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => showUnauthenticated());
});

// Listen for auth completion from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "AUTH_COMPLETE") showAuthenticated();
});
