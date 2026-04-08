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

// --- Settings ---
const inputOwner = document.getElementById("input-owner");
const inputRepo = document.getElementById("input-repo");
const inputFolder = document.getElementById("input-folder");
const btnSaveSettings = document.getElementById("btn-save-settings");
const settingsSaved = document.getElementById("settings-saved");

// Load saved settings on open
chrome.storage.local.get(["repoOwner", "repoName", "repoFolder"], (data) => {
  if (data.repoOwner) inputOwner.value = data.repoOwner;
  if (data.repoName) inputRepo.value = data.repoName;
  if (data.repoFolder) inputFolder.value = data.repoFolder;
});

btnSaveSettings.addEventListener("click", () => {
  const owner = inputOwner.value.trim();
  const repo = inputRepo.value.trim();
  const folder = inputFolder.value.trim();
  if (!owner || !repo) {
    setStatus("Username and repo name are required", true);
    return;
  }
  chrome.storage.local.set({ repoOwner: owner, repoName: repo, repoFolder: folder }, () => {
    settingsSaved.style.display = "block";
    setTimeout(() => (settingsSaved.style.display = "none"), 2000);
    // Notify background to pick up new settings
    chrome.runtime.sendMessage({ type: "UPDATE_SETTINGS", owner, repo, folder });
  });
});
