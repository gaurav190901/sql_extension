// ⚠️  SECURITY NOTE: Replace this with your own GitHub OAuth App Client ID.
// Do NOT share or publish this value publicly.
// Create one at: https://github.com/settings/developers → New OAuth App → Enable Device Flow
const GITHUB_CLIENT_ID = "Ov23li03666HhyOaM0C5";
const REPO_NAME = "sql-practice-solutions";
const PROXY = "http://127.0.0.1:9876";
const MAX_HISTORY = 50;

// --- Proxy health check ---

async function isProxyRunning() {
  try {
    const res = await fetch(`${PROXY}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

// --- GitHub Device Flow Auth ---

async function startDeviceFlow() {
  const running = await isProxyRunning();
  if (!running) {
    throw new Error("Proxy server is not running. Please start it with: node proxy/server.js");
  }
  const res = await fetch(`${PROXY}/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GITHUB_CLIENT_ID, scope: "repo" }),
  });
  return res.json();
}

async function pollForToken(deviceCode, interval) {
  return new Promise((resolve, reject) => {
    let currentInterval = interval * 1000;
    const poll = async () => {
      try {
        const res = await fetch(`${PROXY}/device/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GITHUB_CLIENT_ID,
            device_code: deviceCode,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          }),
        });
        const data = await res.json();

        if (data.access_token) {
          resolve(data.access_token);
        } else if (data.error === "slow_down") {
          currentInterval += 5000;
          setTimeout(poll, currentInterval);
        } else if (data.error === "authorization_pending") {
          setTimeout(poll, currentInterval);
        } else if (data.error === "access_denied" || data.error === "expired_token") {
          reject(new Error(data.error));
        } else {
          setTimeout(poll, currentInterval);
        }
      } catch (e) {
        console.error("Poll error:", e);
        setTimeout(poll, currentInterval);
      }
    };
    setTimeout(poll, currentInterval);
  });
}

// --- GitHub API helpers ---

async function getAuthHeaders() {
  const { token } = await chrome.storage.local.get("token");
  if (!token) throw new Error("Not authenticated. Please connect your GitHub account.");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
  };
}

async function getUsername() {
  const headers = await getAuthHeaders();
  const res = await fetch("https://api.github.com/user", { headers });
  if (res.status === 401) {
    // Token expired — clear it
    await chrome.storage.local.remove("token");
    throw new Error("GitHub token expired. Please reconnect your account.");
  }
  const data = await res.json();
  return data.login;
}

async function ensureRepoExists(username) {
  const headers = await getAuthHeaders();
  const check = await fetch(`https://api.github.com/repos/${username}/${REPO_NAME}`, { headers });
  if (check.status === 404) {
    await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: REPO_NAME,
        description: "SQL practice solutions tracked automatically",
        private: false,
        auto_init: true,
      }),
    });
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// --- Build file content with metadata header ---

function buildFileContent(sql, meta) {
  const header = [
    `-- Problem : ${meta.problemName}`,
    `-- Platform: ${meta.platform}`,
    `-- URL     : ${meta.url}`,
    `-- Solved  : ${meta.solvedAt}`,
    `-- `,
  ].join("\n");
  return header + "\n" + sql;
}

// --- Save to history in local storage ---

async function addToHistory(entry) {
  const { saveHistory = [] } = await chrome.storage.local.get("saveHistory");
  saveHistory.unshift(entry);
  if (saveHistory.length > MAX_HISTORY) saveHistory.length = MAX_HISTORY;
  await chrome.storage.local.set({ saveHistory });
}

// --- Push solution to GitHub ---

async function pushSolution(platform, problemName, sql, url) {
  const headers = await getAuthHeaders();
  const username = await getUsername();
  await ensureRepoExists(username);

  const solvedAt = new Date().toISOString();
  const fileContent = buildFileContent(sql, { problemName, platform, url, solvedAt });

  const safeName = problemName.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase();
  const path = `${platform}/${safeName}.sql`;
  const encoded = btoa(unescape(encodeURIComponent(fileContent)));

  let sha;
  const existing = await fetch(
    `https://api.github.com/repos/${username}/${REPO_NAME}/contents/${path}`,
    { headers }
  );
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const body = {
    message: sha ? `Update: ${problemName}` : `Add: ${problemName}`,
    content: encoded,
    ...(sha && { sha }),
  };

  const res = await fetch(
    `https://api.github.com/repos/${username}/${REPO_NAME}/contents/${path}`,
    { method: "PUT", headers, body: JSON.stringify(body) }
  );

  if (res.ok) {
    await addToHistory({ platform, problemName, url, solvedAt, path });
  }

  return res.ok;
}

// --- Message handler ---

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "START_AUTH") {
    (async () => {
      try {
        const device = await startDeviceFlow();
        await chrome.storage.local.set({ pendingAuth: device });
        sendResponse({ ok: true, userCode: device.user_code, verificationUri: device.verification_uri });
        const token = await pollForToken(device.device_code, device.interval || 5);
        // Remove pendingAuth and store token — popup polling will detect this
        await chrome.storage.local.remove("pendingAuth");
        await chrome.storage.local.set({ token });
      } catch (e) {
        // Only call sendResponse for errors that happen before it was already called
        // (i.e. startDeviceFlow threw before sendResponse was called)
        try { sendResponse({ ok: false, error: e.message }); } catch {}
      }
    })();
    return true;
  }

  if (msg.type === "PUSH_SOLUTION") {
    (async () => {
      try {
        const ok = await pushSolution(msg.platform, msg.problemName, msg.sql, msg.url || "");
        sendResponse({ ok });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg.type === "GET_AUTH_STATUS") {
    chrome.storage.local.get(["token", "pendingAuth"], (data) => {
      sendResponse({
        authenticated: !!data.token,
        pendingAuth: data.pendingAuth || null,
      });
    });
    return true;
  }

  if (msg.type === "GET_HISTORY") {
    chrome.storage.local.get("saveHistory", (data) => {
      sendResponse({ history: data.saveHistory || [] });
    });
    return true;
  }

  if (msg.type === "LOGOUT") {
    chrome.storage.local.remove(["token", "pendingAuth"], () => sendResponse({ ok: true }));
    return true;
  }
});
