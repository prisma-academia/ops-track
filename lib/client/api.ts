"use client";

const CSRF_COOKIE = "mt-csrf";
const CSRF_HEADER = "x-csrf-token";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function ensureCsrf(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;
  const res = await fetch("/api/auth/csrf", { method: "GET", credentials: "include" });
  const body = (await res.json()) as { data?: { csrfToken: string } };
  return body.data?.csrfToken ?? readCookie(CSRF_COOKIE) ?? "";
}

type ApiResponse<T> = { data: T | null; error: { code: string; message: string } | null };

export async function apiPost<T>(
  url: string,
  body: unknown,
  init?: { headers?: Record<string, string> }
): Promise<ApiResponse<T>> {
  const token = await ensureCsrf();
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      [CSRF_HEADER]: token,
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as ApiResponse<T>;
}

export async function apiPatch<T>(
  url: string,
  body: unknown,
  init?: { headers?: Record<string, string> }
): Promise<ApiResponse<T>> {
  const token = await ensureCsrf();
  const res = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      [CSRF_HEADER]: token,
      ...init?.headers,
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as ApiResponse<T>;
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  const token = await ensureCsrf();
  const res = await fetch(url, {
    method: "DELETE",
    credentials: "include",
    headers: { [CSRF_HEADER]: token },
  });
  return (await res.json()) as ApiResponse<T>;
}

export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  const res = await fetch(url, { credentials: "include" });
  return (await res.json()) as ApiResponse<T>;
}
