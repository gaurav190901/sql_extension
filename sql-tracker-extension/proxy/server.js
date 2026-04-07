const http = require("http");
const https = require("https");

const PORT = 9876;

function githubPost(path, body) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams(body).toString();
    const options = {
      hostname: "github.com",
      path,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Invalid JSON from GitHub: ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("Request to GitHub timed out"));
    });
    req.write(postData);
    req.end();
  });
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "chrome-extension://",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Allow any chrome-extension or moz-extension origin
function setCors(res, origin = "") {
  const allowed =
    origin.startsWith("chrome-extension://") ||
    origin.startsWith("moz-extension://") ||
    origin === "";
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin || "*" : "");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers["origin"] || "";
  setCors(res, origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check endpoint — used by extension to detect if proxy is running
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      const params = Object.fromEntries(new URLSearchParams(body));
      let result;

      if (req.url === "/device/code") {
        result = await githubPost("/login/device/code", params);
      } else if (req.url === "/device/token") {
        result = await githubPost("/login/oauth/access_token", params);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not found" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (e) {
      console.error("Proxy error:", e.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`✓ GitHub auth proxy running at http://127.0.0.1:${PORT}`);
  console.log(`  Health check: http://127.0.0.1:${PORT}/health`);
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`✗ Port ${PORT} is already in use. Is the proxy already running?`);
  } else {
    console.error("Server error:", e.message);
  }
  process.exit(1);
});
