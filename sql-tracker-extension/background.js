// GitHub OAuth App credentials
const GITHUB_CLIENT_ID = "Ov23li03666HhyOaM0C5";
const REPO_NAME = "sql-practice-solutions";
const PROXY = "http://127.0.0.1:9876";

// --- GitHub Device Flow Auth ---

async function startDeviceFlow() {
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
        console.log("Poll response:", data);

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
          // Unknown state, keep polling
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
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
  };
}

async function getUsername() {
  const headers = await getAuthHeaders();
  const res = await fetch("https://api.github.com/user", { headers });
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

async function pushSolution(platform, problemName, sql) {
  const headers = await getAuthHeaders();
  const username = await getUsername();
  await ensureRepoExists(username);

  const safeName = problemName.replace(/[^a-z0-9_\-]/gi, "_").toLowerCase();
  const path = `${platform}/${safeName}.sql`;
  const content = btoa(unescape(encodeURIComponent(sql)));

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
    content,
    ...(sha && { sha }),
  };

  const res = await fetch(
    `https://api.github.com/repos/${username}/${REPO_NAME}/contents/${path}`,
    { method: "PUT", headers, body: JSON.stringify(body) }
  );

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
        await chrome.storage.local.set({ token, pendingAuth: null });
        chrome.runtime.sendMessage({ type: "AUTH_COMPLETE" });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  if (msg.type === "PUSH_SOLUTION") {
    (async () => {
      try {
        const ok = await pushSolution(msg.platform, msg.problemName, msg.sql);
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

  if (msg.type === "LOGOUT") {
    chrome.storage.local.remove(["token", "pendingAuth"], () => sendResponse({ ok: true }));
    return true;
  }
});
