import { proxyDjango } from "@/server/djangoProxy";

function handle(request: Request) {
  return proxyDjango(request);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
