import { Platform } from "react-native";

import type { PhotoPick } from "@/services/types";

const configured = process.env.EXPO_PUBLIC_DJANGO_API_URL?.replace(/\/$/, "") ?? "";

/** A localhost API address is the computer that bundled the app, not the browser. */
function pointsAtThisMachine(url: string): boolean {
  return url === "" || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(url);
}

/**
 * An https:// API address is the Cloudflare tunnel in front of Django on
 * http://13.56.184.13:8000. The browser can call that tunnel directly.
 * Without it, local web uses /api on this site, and a phone calls the EC2 API.
 */
export function resolveApiBase(): string {
  if (configured.startsWith("https://")) return configured;
  if (Platform.OS === "web") return "/api";
  if (configured && !pointsAtThisMachine(configured)) return configured;
  return "http://13.56.184.13:8000/api";
}

export const API_BASE = resolveApiBase();

const hostMatch = API_BASE.match(/^https?:\/\/([^/]+)/);
export const API_HOST_LABEL = API_BASE.startsWith("/") ? "this site" : (hostMatch?.[1] ?? API_BASE);

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function errorText(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function networkMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message === "Failed to fetch" || message.includes("Network request failed")) {
    if (API_BASE.startsWith("/")) {
      return "Daily Challenge could not reach the API through this site. From finalproject/dailychallenge, run npm run web so Django starts with the app.";
    }
    return `Daily Challenge could not reach the API at ${API_HOST_LABEL}. Open TCP 8000 on that host.`;
  }
  return message || "The request failed.";
}

function messageFrom(data: unknown, status: number): string {
  if (data && typeof data === "object" && "detail" in data && typeof data.detail === "string") {
    return data.detail;
  }
  if (data && typeof data === "object") {
    const parts = Object.entries(data).map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(" ") : String(value);
      return `${key}: ${text}`;
    });
    if (parts.length > 0) return parts.join(" ");
  }
  return `The server returned HTTP ${status}.`;
}

export async function request<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
    form?: FormData;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.token) headers.Authorization = `Token ${options.token}`;

  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
    });
  } catch (error) {
    throw new ApiError(0, networkMessage(error));
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }
  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(data, response.status));
  }
  return data as T;
}

export async function appendPhoto(form: FormData, photo: PhotoPick) {
  if (Platform.OS === "web") {
    const file = await fetch(photo.uri);
    const blob = await file.blob();
    form.append("photo", blob, photo.name);
    return;
  }
  form.append("photo", {
    uri: photo.uri,
    name: photo.name,
    type: photo.type,
  } as unknown as Blob);
}
