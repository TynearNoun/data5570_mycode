// Expo's host rejects a request to a bare IP (Cloudflare error 1003). This name
// resolves to 13.56.184.13, so the hosted site can reach the same Django API.
const DJANGO_ORIGIN = "http://13.56.184.13.sslip.io:8000";
const DJANGO_IP_ORIGIN = "http://13.56.184.13:8000";

const HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
]);

export async function proxyDjango(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const target = `${DJANGO_ORIGIN}${incoming.pathname}${incoming.search}`;
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
  } catch {
    return Response.json(
      { detail: "Daily Challenge could not reach the API at 13.56.184.13:8000." },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_HEADERS.has(key.toLowerCase())) responseHeaders.set(key, value);
  });

  const type = upstream.headers.get("content-type") ?? "";
  if (type.includes("application/json") || type.includes("text/")) {
    const text = (await upstream.text()).replaceAll(DJANGO_ORIGIN, "").replaceAll(DJANGO_IP_ORIGIN, "");
    return new Response(text, { status: upstream.status, headers: responseHeaders });
  }

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
}
