import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const root = process.cwd();
const startPort = Number(process.env.PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function filePathFromUrl(url) {
  const requestPath = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const resolved = normalize(join(root, requestPath === "/" ? "index.html" : requestPath));

  if (!resolved.startsWith(root)) {
    return null;
  }

  return existsSync(resolved) ? resolved : null;
}

function createStaticServer(port) {
  const server = createServer((request, response) => {
    const filePath = filePathFromUrl(request.url || "/");

    if (!filePath) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": types[extname(filePath)] || "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      createStaticServer(port + 1);
      return;
    }

    throw error;
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Avenue Caribbean's menu: http://127.0.0.1:${port}`);
  });
}

createStaticServer(startPort);
