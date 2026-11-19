const http = require("http");
const https = require("https");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const djangoOrigin = process.env.DJANGO_PROXY_TARGET || "http://127.0.0.1:8042";

config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    const url = req.url || "";
    if (url.startsWith("/api") || url.startsWith("/media")) {
      proxyToDjango(req, res);
      return;
    }
    return middleware(req, res, next);
  };
};

function proxyToDjango(req, res) {
  const target = new URL(djangoOrigin);
  const transport = target.protocol === "https:" ? https : http;
  const headers = { ...req.headers, host: req.headers.host };
  const proxyReq = transport.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      method: req.method,
      path: req.url,
      headers,
    },
    (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders["transfer-encoding"];
      res.writeHead(proxyRes.statusCode || 502, responseHeaders);
      proxyRes.pipe(res);
    },
  );
  proxyReq.on("error", () => {
    if (res.headersSent) return;
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ detail: "The Daily Challenge API is not running on 127.0.0.1:8042." }));
  });
  req.pipe(proxyReq);
}

module.exports = config;
