import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";


const root = resolve(dirname(fileURLToPath(import.meta.url)), "build");
const config = JSON.parse(
  await readFile(resolve(dirname(fileURLToPath(import.meta.url)), "serve.json"), "utf8"),
);
const configuredHeaders = Object.fromEntries(
  config.headers.flatMap((rule) => rule.headers).map(({ key, value }) => [key, value]),
);
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

async function readableFile(path) {
  try {
    await access(path);
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

async function requestedFile(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  } catch {
    return null;
  }
  const candidate = normalize(join(root, pathname));
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  return (await readableFile(candidate)) ? candidate : join(root, "index.html");
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD", ...configuredHeaders });
    response.end();
    return;
  }

  const file = await requestedFile(request.url || "/");
  if (!file || !(await readableFile(file))) {
    response.writeHead(404, configuredHeaders);
    response.end();
    return;
  }

  const headers = {
    ...configuredHeaders,
    "Content-Type": mimeTypes.get(extname(file).toLowerCase()) || "application/octet-stream",
    "Cache-Control": file.includes(`${sep}assets${sep}`)
      ? "public, max-age=31536000, immutable"
      : "no-store",
  };
  response.writeHead(200, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(file)
    .on("error", () => {
      if (!response.headersSent) response.writeHead(500, configuredHeaders);
      response.end();
    })
    .pipe(response);
});

server.listen(Number(process.env.PORT || 8080), "0.0.0.0");
