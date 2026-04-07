# sql_extension
# SQL Practice Tracker — Browser Extension

Automatically saves your solved SQL problems to a GitHub repo, organized by platform and problem name. Each saved file includes metadata (problem URL, date solved) as a comment header.

---

## Platform Compatibility

| Platform | URL | Auto-detect Accepted | Editor Type | Notes |
|---|---|---|---|---|
| LeetCode | leetcode.com/problems | ✅ | Monaco | Watches for "Accepted" result banner |
| HackerRank | hackerrank.com/challenges | ✅ | CodeMirror | Watches for success state element |
| SQLZoo | sqlzoo.net | ✅ | CodeMirror / Textarea | Watches for "Correct" answer indicator |
| sql-practice.com | sql-practice.com | ✅ | CodeMirror | Watches for correct answer element |
| SQLFiddle | sqlfiddle.com | ✅ | CodeMirror | Saves when result table appears |
| DB Fiddle | db-fiddle.com | ✅ | CodeMirror | Saves when result table appears |
| StrataScratch | platform.stratascratch.com | ✅ | Monaco | Watches for correct/passed indicator |

> SQLFiddle and DB Fiddle don't have "problems" — saves are named by page title or timestamp.

---

## Browser Compatibility

| Browser | Supported | Notes |
|---|---|---|
| Chrome | ✅ | Fully supported (Manifest V3) |
| Edge | ✅ | Chromium-based, same as Chrome |
| Firefox | ⚠️ | Load as temporary add-on via `about:debugging` |
| Safari | ❌ | Not supported |

---

## Prerequisites

- Node.js (to run the proxy server)
- A GitHub account
- Chrome, Edge, or Firefox browser

---

## Setup Guide

### Step 1 — Create a GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the fields:
   - **Application name**: SQL Practice Tracker
   - **Homepage URL**: `https://github.com`
   - **Authorization callback URL**: `https://github.com`
4. Check the **Enable Device Flow** checkbox
5. Click "Register application"
6. Copy the **Client ID** shown on the next page

### Step 2 — Add your Client ID to the extension

Open `background.js` and replace the placeholder:

```js
const GITHUB_CLIENT_ID = "YOUR_GITHUB_CLIENT_ID";
```

> ⚠️ Keep your Client ID private. Do not commit it to a public repo.

### Step 3 — Start the proxy server

The proxy is a small local Node.js server that handles GitHub OAuth on behalf of the extension (browser extensions can't hit `github.com/login/device` directly due to CORS restrictions).

```bash
node proxy/server.js
```

Expected output:
```
✓ GitHub auth proxy running at http://127.0.0.1:9876
  Health check: http://127.0.0.1:9876/health
```

> You need to keep this running whenever you use the extension. If it's not running, the popup will show a clear error with the command to start it.

### Step 4 — Load the extension in your browser

**Chrome / Edge:**
1. Go to `chrome://extensions`
2. Toggle on "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `sql-tracker-extension` folder
5. The extension icon will appear in your toolbar

**Firefox:**
1. Go to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file inside `sql-tracker-extension`

### Step 5 — Connect your GitHub account

1. Click the extension icon in your toolbar
2. Click "Connect GitHub"
3. A device code will appear in the popup, e.g. `ABCD-1234`
4. Click the link shown (or go to [github.com/login/device](https://github.com/login/device))
5. Enter the code and click "Authorize"
6. The popup will update to show "Connected to GitHub"

---

## Usage Guide

Once connected, the extension works automatically in the background — no extra steps needed.

### Solving a problem

1. Open any supported platform (e.g. LeetCode, HackerRank)
2. Navigate to a SQL problem
3. Write and submit your solution
4. When your answer is accepted, you'll see a green toast notification:
   ```
   ✓ Saved to GitHub: employees-earning-more-than-their-managers
   ```
5. The solution is pushed to your `sql-practice-solutions` GitHub repo

### Viewing your saves

Click the extension icon at any time to see:
- Your connection status
- All active platforms
- A list of your recent saves (last 50) with platform and date

### Your GitHub repo

The extension automatically creates a public repo called `sql-practice-solutions` on your account the first time you save a solution. Solutions are organized like this:

```
sql-practice-solutions/
├── leetcode/
│   ├── employees-earning-more-than-their-managers.sql
│   └── second-highest-salary.sql
├── hackerrank/
│   └── weather-observation-station-5.sql
├── sqlzoo/
│   └── select-basics.sql
└── stratascratch/
    └── find-the-top-10-ranked-songs.sql
```

### Saved file format

Each `.sql` file includes a metadata header:

```sql
-- Problem : employees-earning-more-than-their-managers
-- Platform: leetcode
-- URL     : https://leetcode.com/problems/employees-earning-more-than-their-managers/
-- Solved  : 2024-05-01T14:32:00.000Z
-- 

SELECT e1.Name AS Employee
FROM Employee e1
JOIN Employee e2 ON e1.ManagerId = e2.Id
WHERE e1.Salary > e2.Salary;
```

### Disconnecting

Click the extension icon and click "Disconnect" to remove your GitHub token from the extension. Your saved solutions in GitHub are not affected.

---

## Troubleshooting

**"Proxy server is not running"**
Start the proxy: `node proxy/server.js`

**"GitHub token expired. Please reconnect"**
Click "Connect GitHub" again to re-authenticate.

**Toast shows "Failed to save"**
- Check that the proxy server is still running
- Check that your GitHub token hasn't expired (disconnect and reconnect)
- Open the browser console on the background service worker (`chrome://extensions` → "Inspect views: service worker") for detailed error logs

**Solution not detected on a platform**
Some platforms update their UI frequently. If the auto-detection stops working, open a GitHub issue with the platform name and the current URL pattern.

**Firefox: extension stops working after browser restart**
Firefox only supports temporary add-ons in developer mode — they're removed on restart. You'll need to reload it each session via `about:debugging`.
