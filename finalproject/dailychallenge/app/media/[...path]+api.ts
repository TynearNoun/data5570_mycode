import { proxyDjango } from "@/server/djangoProxy";

function handle(request: Request) {
  return proxyDjango(request);
}

export const GET = handle;
export const HEAD = handle;
