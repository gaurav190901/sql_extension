// GitHub OAuth App credentials
const GITHUB_CLIENT_ID = "Ov23li03666HhyOaM0C5";
const PROXY = "http://127.0.0.1:9876";
const MAX_HISTORY = 50;

// Default repo settings (overridden by user settings in storage)
const DEFAULT_OWNER = "gaurav190901";
const DEFAULT_REPO = "sql_extension";

async function getRepoSettings() {
  const data = await chrome.storage.local.get(["repoOwner", "repoName", "repoFolder"]);
  return {
    owner: data.repoOwner || DEFAULT_OWNER,
    repo: data.repoName || DEFAULT_REPO,
    folder: data.repoFolder || "",
  };
}

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
    await chrome.storage.local.remove("token");
    throw new Error("GitHub token expired. Please reconnect your account.");
  }
  const data = await res.json();
  return data.login;
}

// --- Build file content with metadata header ---

function buildFileContent(sql, meta) {
  return [
    `-- Problem : ${meta.problemName}`,
    `-- Platform: ${meta.platform}`,
    `-- URL     : ${meta.url}`,
    `-- Solved  : ${meta.solvedAt}`,
    `--`,
    "",
    sql,
  ].join("\n");
}

// --- Save to history ---

async function addToHistory(entry) {
  const { saveHistory = [] } = await chrome.storage.local.get("saveHistory");
  saveHistory.unshift(entry);
  if (saveHistory.length > MAX_HISTORY) saveHistory.length = MAX_HISTORY;
  await chrome.storage.local.set({ saveHistory });
}

// --- Push solution to GitHub ---

async function pushSolution(platform, problemName, sql, url) {
  const headers = await getAuthHeaders();
  const { owner, repo, folder } = await getRepoSettings();

  const solvedAt = new Date().toISOString();
  const fileContent = buildFileContent(sql, { problemName, platform, url, solvedAt });

  const safeName = problemName.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase();
  const filePath = folder
    ? `${folder}/${platform}/${safeName}.sql`
    : `${platform}/${safeName}.sql`;
  const encoded = btoa(unescape(encodeURIComponent(fileContent)));

  let sha;
  const existing = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    { headers }
  );
  if (existing.ok) {
    const data = await existing.json();
    sha = data.sha;
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        message: sha ? `Update: ${problemName}` : `Add: ${problemName}`,
        content: encoded,
        ...(sha && { sha }),
      }),
    }
  );

  if (res.ok) {
    await addToHistory({ platform, problemName, url, solvedAt, path: filePath });
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
        await chrome.storage.local.remove("pendingAuth");
        await chrome.storage.local.set({ token });
      } catch (e) {
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
      sendResponse({ authenticated: !!data.token, pendingAuth: data.pendingAuth || null });
    });
    return true;
  }

  if (msg.type === "GET_HISTORY") {
    chrome.storage.local.get("saveHistory", (data) => {
      sendResponse({ history: data.saveHistory || [] });
    });
    return true;
  }

  if (msg.type === "UPDATE_SETTINGS") {
    // Settings already saved by popup via chrome.storage, nothing extra needed
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "LOGOUT") {
    chrome.storage.local.remove(["token", "pendingAuth"], () => sendResponse({ ok: true }));
    return true;
  }
});
