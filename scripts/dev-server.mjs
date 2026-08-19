import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT) || 5173;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405, { "content-type": "text/plain" });
        res.end("Method Not Allowed");
        return;
    }

    let pathname;
    try {
        pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
    } catch {
        pathname = req.url;
    }

    if (pathname === "/") {
        res.writeHead(302, { location: "/examples/synthesizer.html" });
        res.end();
        return;
    }

    // Resolve the requested file inside the project root and refuse path traversal.
    // Use a relative `..` segment (not an absolute path) so that `resolve()` keeps
    // the root as the base and any `..` can never escape it.
    const file = resolve(root, "." + pathname);
    if (!file.startsWith(root + "/")) {
        res.writeHead(403, { "content-type": "text/plain" });
        res.end("Forbidden");
        return;
    }

    try {
        const info = await stat(file).catch(() => null);
        if (!info || !info.isFile()) {
            res.writeHead(404, { "content-type": "text/plain" });
            res.end("Not Found");
            return;
        }
        const data = await readFile(file);
        res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
        res.end(req.method === "HEAD" ? undefined : data);
    } catch {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end("Internal Server Error");
    }
});

server.listen(port, () => {
    console.log(`speechreader dev server running at http://localhost:${port}/`);
    console.log(`Open the synthesizer example: http://localhost:${port}/examples/synthesizer.html`);
    console.log("Rebuild the library with `npm run build` after editing src/, then refresh the page.");
});
