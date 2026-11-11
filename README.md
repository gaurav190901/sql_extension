# SQL Practice Tracker — Browser Extension

Automatically saves your accepted SQL solutions to a GitHub repo, organized by platform and problem name. Each file gets a metadata header (problem, platform, URL, date solved).

---

## Platform Compatibility

| Platform | Status | How it's detected |
|---|---|---|
| LeetCode | ✅ Enabled | Captures the exact code from LeetCode's submit/check requests when the result is **Accepted**; falls back to the result banner. Only SQL languages (MySQL, MS SQL, Oracle, PostgreSQL) are saved. |
| HackerRank | ✅ Enabled | Saves when the success ("congrats") panel appears. Non-SQL languages are skipped. |
| SQLZoo, sql-practice.com, StrataScratch, DB Fiddle, SQLFiddle | 🚧 Not enabled | Draft scripts exist in `content/` but are not registered in `manifest.json` yet. |

## Browser Compatibility

| Browser | Supported | Notes |
|---|---|---|
| Chrome 111+ | ✅ | Manifest V3 |
| Edge 111+ | ✅ | Chromium-based |
| Firefox 128+ | ⚠️ | Load as a temporary add-on via `about:debugging` (removed on restart) |
| Safari | ❌ | |

---

## Setup

### 1. Create a repo for your solutions

Create a GitHub repo (public or private), e.g. `sql-practice-solutions`. Keep it separate from this extension's source code.

### 2. Create a fine-grained token

1. Go to [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
2. **Repository access** → *Only select repositories* → pick your solutions repo
3. **Permissions** → Repository permissions → **Contents: Read and write**
4. Generate and copy the token

### 3. Load the extension

**Chrome / Edge:** `chrome://extensions` → enable *Developer mode* → *Load unpacked* → select the `sql-tracker-extension` folder.

**Firefox:** `about:debugging` → *This Firefox* → *Load Temporary Add-on* → select `sql-tracker-extension/manifest.json`.

### 4. Configure

1. Click the extension icon
2. Paste the token and click **Save Token** — it's verified against GitHub and the popup shows `Connected as @you`
3. Under **Destinations**, enter `owner/repo` (or `owner/repo/folder` to save into a subfolder). You can add more than one; every save goes to all of them.
4. Click **Save Destinations**

---

## Usage

Solve a SQL problem and submit it. When it's accepted you'll see a toast:

```
✓ Saved to GitHub: employees-earning-more-than-their-managers
```

- Re-submitting identical SQL doesn't create a new commit (`✓ Already saved (no changes)`).
- Submitting a different accepted solution updates the file (`Update: leetcode/<problem>` commit).
- The popup lists your 10 most recent saves.

### Repo layout

```
<your-repo>/[folder/]
├── leetcode/
│   └── employees-earning-more-than-their-managers.sql
└── hackerrank/
    └── weather-observation-station-5.sql
```

### File format

```sql
-- Problem : employees-earning-more-than-their-managers
-- Platform: leetcode
-- URL     : https://leetcode.com/problems/employees-earning-more-than-their-managers/
-- Solved  : 2026-05-01T14:32:00.000Z
-- ----

SELECT e1.name AS Employee
FROM Employee e1
JOIN Employee e2 ON e1.managerId = e2.id
WHERE e1.salary > e2.salary;
```

---

## Troubleshooting

The error toast tells you what went wrong:

| Message | Fix |
|---|---|
| `Not connected` | Add a token in the popup |
| `No destination repo set` | Add `owner/repo` under Destinations |
| `GitHub token is invalid or expired` | Create a new token and save it again |
| `Repo … not found, or token can't access it` | Check the repo name, and that the fine-grained token includes that repo |
| `No write access` | Token needs **Contents: Read and write** |

**Nothing happens after an accepted submission:** open DevTools on the problem page and look for `[SQL Tracker]` messages in the console. For background errors: `chrome://extensions` → SQL Practice Tracker → *Inspect views: service worker*.

## How it works

- `content/page-bridge.js` runs in the page's main world (`"world": "MAIN"`) so it can read the Monaco/CodeMirror editor and, on LeetCode, observe the submit/check requests.
- `content/leetcode.js` / `content/hackerrank.js` detect an accepted solution and send it to the background worker.
- `background.js` writes the file with the GitHub Contents API, skipping the write when the SQL hasn't changed.
