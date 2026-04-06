const statusEl = document.getElementById("status");
const btnAuth = document.getElementById("btn-auth");
const btnLogout = document.getElementById("btn-logout");
const authSteps = document.getElementById("auth-steps");
const userCodeEl = document.getElementById("user-code");
const verifyLink = document.getElementById("verify-link");

function setStatus(text, isError = false) {
  statusEl.innerHTML = isError
    ? `<span class="error">${text}</span>`
    : text;
}

function showAuthenticated() {
  setStatus('Status: <span>Connected to GitHub</span>');
  btnAuth.style.display = "none";
  btnLogout.style.display = "block";
  authSteps.style.display = "none";
}

function showUnauthenticated() {
  setStatus("Status: Not connected");
  btnAuth.style.display = "block";
  btnLogout.style.display = "none";
  authSteps.style.display = "none";
}

// Check current auth state on open
chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (res) => {
  if (res.authenticated) {
    showAuthenticated();
  } else if (res.pendingAuth) {
    showPendingAuth(res.pendingAuth);
  } else {
    showUnauthenticated();
  }
});

function showPendingAuth(device) {
  setStatus("Waiting for GitHub authorization...");
  userCodeEl.textContent = device.user_code;
  verifyLink.href = device.verification_uri;
  verifyLink.textContent = device.verification_uri;
  authSteps.style.display = "block";
  btnAuth.style.display = "none";
}

btnAuth.addEventListener("click", () => {
  setStatus("Starting authorization...");
  btnAuth.disabled = true;
  chrome.runtime.sendMessage({ type: "START_AUTH" }, (res) => {
    btnAuth.disabled = false;
    if (res?.ok) {
      showPendingAuth({ user_code: res.userCode, verification_uri: res.verificationUri });
    } else {
      setStatus(`Error: ${res?.error || "Failed to start auth"}`, true);
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
