const MAX_HISTORY = 50;
const GH_API = "https://api.github.com";

// ---------- Storage helpers ----------

async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  if (!token) throw new Error("Not connected. Open the extension popup and add a GitHub token.");
  return token;
}

async function getDestinations() {
  const { destinations } = await chrome.storage.local.get("destinations");
  const list = (destinations || []).map(parseDestination).filter(Boolean);
  if (!list.length) throw new Error("No destination repo set. Open the extension popup to add one.");
  return list;
}

// "owner/repo" or "owner/repo/sub/folder"
function parseDestination(str) {
  const parts = String(str || "").trim().replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1], folder: parts.slice(2).join("/"), label: parts.join("/") };
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// ---------- File content ----------

const HEADER_END = "-- ----";

function buildFileContent(sql, meta) {
  return [
    `-- Problem : ${meta.problemName}`,
    `-- Platform: ${meta.platform}`,
    `-- URL     : ${meta.url}`,
    `-- Solved  : ${meta.solvedAt}`,
    HEADER_END,
    "",
    sql.replace(/\s+$/, ""),
    "",
  ].join("\n");
}

// Strip our metadata header (current or legacy "--" terminator) to compare SQL bodies.
function extractBody(content) {
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].startsWith("-- ") && lines[i] !== HEADER_END) i++;
  if (i < lines.length && (lines[i] === HEADER_END || lines[i].trim() === "--")) i++;
  return lines.slice(i).join("\n").trim();
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function safeFileName(name) {
  return (
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9_\-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown-problem"
  );
}

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function explainError(res, dest) {
  let detail = "";
  try { detail = (await res.json()).message || ""; } catch {}
  switch (res.status) {
    case 401: return "GitHub token is invalid or expired. Reconnect in the popup.";
    case 403: return `No write access to ${dest.label}${detail ? ` (${detail})` : ""}.`;
    case 404: return `Repo ${dest.owner}/${dest.repo} not found, or token can't access it.`;
    case 409:
    case 422: return `GitHub rejected the update (${detail || res.status}). Try again.`;
    default: return `GitHub error ${res.status}${detail ? `: ${detail}` : ""}`;
  }
}

// ---------- Push ----------

async function pushToDestination(dest, token, { platform, problemName, sql, url, solvedAt }) {
  const headers = ghHeaders(token);
  const fileName = `${safeFileName(problemName)}.sql`;
  const filePath = [dest.folder, platform, fileName].filter(Boolean).join("/");
  const endpoint = `${GH_API}/repos/${dest.owner}/${dest.repo}/contents/${encodePath(filePath)}`;

  let sha;
  const existing = await fetch(endpoint, { headers });
  if (existing.ok) {
    const json = await existing.json();
    sha = json.sha;
    if (json.content && extractBody(fromBase64(json.content)) === sql.trim()) {
      return { unchanged: true, path: filePath };
    }
  } else if (existing.status !== 404) {
    throw new Error(await explainError(existing, dest));
  }

  const content = buildFileContent(sql, { problemName, platform, url, solvedAt });
  const res = await fetch(endpoint, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `${sha ? "Update" : "Add"}: ${platform}/${problemName}`,
      content: toBase64(content),
      ...(sha && { sha }),
    }),
  });
  if (!res.ok) throw new Error(await explainError(res, dest));
  return { unchanged: false, path: filePath };
}

async function pushSolution({ platform, problemName, sql, url }) {
  if (!sql || !sql.trim()) throw new Error("Empty solution, nothing to save.");
  const token = await getToken();
  const destinations = await getDestinations();
  const solvedAt = new Date().toISOString();

  const results = await Promise.allSettled(
    destinations.map((d) => pushToDestination(d, token, { platform, problemName, sql, url, solvedAt }))
  );

  const errors = [];
  let allUnchanged = true;
  results.forEach((r, i) => {
    if (r.status === "rejected") errors.push(`${destinations[i].label}: ${r.reason.message}`);
    else if (!r.value.unchanged) allUnchanged = false;
  });

  const okCount = results.length - errors.length;
  if (okCount > 0 && !allUnchanged) {
    await addToHistory({ platform, problemName, url, solvedAt, ok: errors.length === 0 });
  }

  if (errors.length) return { ok: false, error: errors.join(" | ") };
  return { ok: true, unchanged: allUnchanged };
}

async function addToHistory(entry) {
  const { saveHistory = [] } = await chrome.storage.local.get("saveHistory");
  saveHistory.unshift(entry);
  if (saveHistory.length > MAX_HISTORY) saveHistory.length = MAX_HISTORY;
  await chrome.storage.local.set({ saveHistory });
}

// ---------- Delete all solutions ----------

// Folder names the content scripts save into (see PLATFORM in content/*.js).
const PLATFORM_DIRS = ["leetcode", "hackerrank", "sqlzoo", "sql-practice", "stratascratch", "db-fiddle", "sqlfiddle"];

async function ghJson(url, token, dest, init = {}) {
  const res = await fetch(url, { ...init, headers: ghHeaders(token) });
  if (!res.ok) throw new Error(await explainError(res, dest));
  return res.json();
}

// Finds `<folder>/<platform>/*.sql` files in a destination's default branch.
async function findSolutionFiles(dest, token) {
  const base = `${GH_API}/repos/${dest.owner}/${dest.repo}`;
  const repo = await ghJson(base, token, dest);
  const branch = repo.default_branch;

  const refRes = await fetch(`${base}/git/ref/heads/${encodePath(branch)}`, { headers: ghHeaders(token) });
  if (refRes.status === 404 || refRes.status === 409) return { base, branch, files: [] }; // empty repo
  if (!refRes.ok) throw new Error(await explainError(refRes, dest));
  const headSha = (await refRes.json()).object.sha;

  const commit = await ghJson(`${base}/git/commits/${headSha}`, token, dest);
  const tree = await ghJson(`${base}/git/trees/${commit.tree.sha}?recursive=1`, token, dest);
  if (tree.truncated) throw new Error(`${dest.label} is too large to scan in one request.`);

  const prefix = dest.folder ? `${dest.folder.replace(/\/+$/, "")}/` : "";
  const files = tree.tree
    .filter((e) => e.type === "blob" && e.path.startsWith(prefix))
    .map((e) => e.path)
    .filter((p) => {
      const rest = p.slice(prefix.length).split("/");
      return rest.length === 2 && PLATFORM_DIRS.includes(rest[0]) && rest[1].endsWith(".sql");
    });

  return { base, branch, headSha, treeSha: commit.tree.sha, files };
}

async function deleteSolutionsIn(dest, token, dryRun) {
  const found = await findSolutionFiles(dest, token);
  if (dryRun || !found.files.length) return found.files.length;

  const { base, branch, headSha, treeSha, files } = found;
  const newTree = await ghJson(`${base}/git/trees`, token, dest, {
    method: "POST",
    body: JSON.stringify({
      base_tree: treeSha,
      tree: files.map((path) => ({ path, mode: "100644", type: "blob", sha: null })),
    }),
  });
  const newCommit = await ghJson(`${base}/git/commits`, token, dest, {
    method: "POST",
    body: JSON.stringify({
      message: `Start over: remove ${files.length} saved solution${files.length === 1 ? "" : "s"}`,
      tree: newTree.sha,
      parents: [headSha],
    }),
  });
  await ghJson(`${base}/git/refs/heads/${encodePath(branch)}`, token, dest, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommit.sha }),
  });
  return files.length;
}

// dryRun: only count. Otherwise delete from every destination and clear local history.
async function deleteAllSolutions(dryRun) {
  const token = await getToken();
  const destinations = await getDestinations();
  const results = await Promise.allSettled(destinations.map((d) => deleteSolutionsIn(d, token, dryRun)));

  let total = 0;
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") total += r.value;
    else errors.push(`${destinations[i].label}: ${r.reason.message}`);
  });

  if (!dryRun && !errors.length) await chrome.storage.local.remove("saveHistory");
  if (errors.length) return { ok: false, count: total, error: errors.join(" | ") };
  return { ok: true, count: total, repos: destinations.length };
}

// ---------- Token ----------

async function verifyAndSaveToken(token) {
  const res = await fetch(`${GH_API}/user`, { headers: ghHeaders(token) });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "Invalid token." : `GitHub error ${res.status}.`);
  }
  const user = await res.json();
  await chrome.storage.local.set({ token, githubLogin: user.login });
  return user.login;
}

// ---------- Messaging ----------

function respond(promise, sendResponse) {
  promise
    .then((r) => sendResponse(r))
    .catch((e) => sendResponse({ ok: false, error: e.message }));
  return true;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case "SAVE_TOKEN":
      return respond(
        verifyAndSaveToken(String(msg.token || "").trim()).then((login) => ({ ok: true, login })),
        sendResponse
      );

    case "PUSH_SOLUTION":
      return respond(
        pushSolution({
          platform: msg.platform,
          problemName: msg.problemName,
          sql: msg.sql,
          url: msg.url || "",
        }),
        sendResponse
      );

    case "GET_AUTH_STATUS":
      return respond(
        chrome.storage.local
          .get(["token", "githubLogin"])
          .then((d) => ({ authenticated: !!d.token, login: d.githubLogin || "" })),
        sendResponse
      );

    case "GET_HISTORY":
      return respond(
        chrome.storage.local.get("saveHistory").then((d) => ({ history: d.saveHistory || [] })),
        sendResponse
      );

    case "COUNT_SOLUTIONS":
      return respond(deleteAllSolutions(true), sendResponse);

    case "DELETE_ALL_SOLUTIONS":
      return respond(deleteAllSolutions(false), sendResponse);

    case "LOGOUT":
      return respond(
        chrome.storage.local.remove(["token", "githubLogin"]).then(() => ({ ok: true })),
        sendResponse
      );
  }
});
