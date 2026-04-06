# SQL Practice Tracker — Browser Extension

Automatically saves your solved SQL problems to a GitHub repo, organized by platform and problem name.

## Supported Platforms
- LeetCode
- HackerRank
- SQLZoo

## Setup

### 1. Create a GitHub OAuth App

1. Go to https://github.com/settings/developers → "New OAuth App"
2. Set **Application name**: SQL Practice Tracker
3. Set **Homepage URL**: https://github.com
4. Set **Authorization callback URL**: https://github.com (not used, device flow doesn't need it)
5. Enable **Device Flow** checkbox
6. Copy the **Client ID**

### 2. Add your Client ID

Open `background.js` and replace:
```js
const GITHUB_CLIENT_ID = "YOUR_GITHUB_CLIENT_ID";
```

### 3. Load the extension

**Chrome / Edge:**
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" → select this folder

**Firefox:**
1. Go to `about:debugging`
2. Click "This Firefox" → "Load Temporary Add-on"
3. Select `manifest.json`

### 4. Authenticate

1. Click the extension icon
2. Click "Connect GitHub"
3. A code will appear — go to the URL shown (github.com/login/device) on any device (phone works)
4. Enter the code and authorize

### How it works

Once authenticated, solve a SQL problem on any supported platform. When your submission is accepted, the extension automatically:
- Creates a `sql-practice-solutions` repo on your GitHub (if it doesn't exist)
- Saves the solution as `platform/problem-name.sql`
- Shows a toast notification confirming the save
