const statusEl = document.getElementById("status");
const sectionToken = document.getElementById("section-token");
const sectionConnected = document.getElementById("section-connected");
const inputToken = document.getElementById("input-token");
const btnSaveToken = document.getElementById("btn-save-token");
const btnLogout = document.getElementById("btn-logout");
const destinationsEl = document.getElementById("destinations");
const btnAddDest = document.getElementById("btn-add-dest");
const btnSaveDests = document.getElementById("btn-save-dests");
const savedMsg = document.getElementById("saved-msg");
const historyEl = document.getElementById("history");

const DEST_RE = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+(\/[^\s]+)*\/?$/;

function setStatus(text, { error = false, highlight = "" } = {}) {
  statusEl.textContent = text;
  if (highlight) {
    const span = document.createElement("span");
    span.textContent = highlight;
    if (error) span.className = "error";
    statusEl.appendChild(span);
  }
}

function showConnected(login) {
  setStatus("Status: ", { highlight: login ? `Connected as @${login}` : "Connected to GitHub" });
  sectionToken.style.display = "none";
  sectionConnected.style.display = "block";
}

function showDisconnected(error) {
  if (error) setStatus("Status: ", { error: true, highlight: error });
  else setStatus("Status: Not connected");
  sectionToken.style.display = "block";
  sectionConnected.style.display = "none";
}

function flash(text, isError = false) {
  savedMsg.textContent = text;
  savedMsg.classList.toggle("error", isError);
  savedMsg.style.display = "block";
  setTimeout(() => (savedMsg.style.display = "none"), 2500);
}

function addDestRow(value = "") {
  const row = document.createElement("div");
  row.className = "dest-row";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "owner/repo or owner/repo/folder";
  input.value = value;
  input.addEventListener("input", () => input.classList.remove("invalid"));

  const remove = document.createElement("button");
  remove.title = "Remove";
  remove.textContent = "✕";
  remove.addEventListener("click", () => row.remove());

  row.append(input, remove);
  destinationsEl.appendChild(row);
}

function renderHistory(history) {
  historyEl.replaceChildren();
  if (!history.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Nothing saved yet.";
    historyEl.appendChild(li);
    return;
  }
  for (const h of history.slice(0, 10)) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.textContent = h.problemName;
    a.title = h.problemName;
    if (/^https:\/\//.test(h.url || "")) {
      a.href = h.url;
      a.target = "_blank";
    }
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = `${h.platform} · ${new Date(h.solvedAt).toLocaleDateString()}`;
    li.append(a, meta);
    historyEl.appendChild(li);
  }
}

// ---------- Init ----------

chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (res) => {
  if (res?.authenticated) showConnected(res.login);
  else showDisconnected();
});

chrome.storage.local.get("destinations", (data) => {
  const dests = data.destinations || [];
  if (dests.length) dests.forEach((d) => addDestRow(d));
  else addDestRow();
});

chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (res) => renderHistory(res?.history || []));

// ---------- Events ----------

btnSaveToken.addEventListener("click", () => {
  const token = inputToken.value.trim();
  if (!token) { showDisconnected("Please enter a token"); return; }
  btnSaveToken.disabled = true;
  setStatus("Verifying token…");
  chrome.runtime.sendMessage({ type: "SAVE_TOKEN", token }, (res) => {
    btnSaveToken.disabled = false;
    if (res?.ok) {
      inputToken.value = "";
      showConnected(res.login);
    } else {
      showDisconnected(res?.error || "Could not verify token");
    }
  });
});

btnLogout.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "LOGOUT" }, () => showDisconnected());
});

btnAddDest.addEventListener("click", () => addDestRow());

btnSaveDests.addEventListener("click", () => {
  const inputs = Array.from(destinationsEl.querySelectorAll("input"));
  let valid = true;
  const dests = [];
  for (const input of inputs) {
    const v = input.value.trim().replace(/^https:\/\/github\.com\//, "").replace(/\/+$/, "");
    if (!v) continue;
    if (!DEST_RE.test(v)) {
      input.classList.add("invalid");
      valid = false;
    } else {
      input.value = v;
      dests.push(v);
    }
  }
  if (!valid) { flash("Use the format owner/repo or owner/repo/folder", true); return; }
  if (!dests.length) { flash("Add at least one destination", true); return; }
  chrome.storage.local.set({ destinations: dests }, () => flash("✓ Saved"));
});
