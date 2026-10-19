import { apiPost } from "@/lib/client/api";

const CSRF_COOKIE = "mt-csrf";
const CSRF_HEADER = "x-csrf-token";

type ApiResponse<T> = { data: T | null; error: { code: string; message: string } | null };

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

function resolveContentType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  return "image/jpeg";
}

async function uploadViaServerProxy(file: File): Promise<string> {
  const token = await ensureCsrf();
  const formData = new FormData();
  formData.append("file", file, file.name);

  const res = await fetch("/api/tenant/upload/direct", {
    method: "POST",
    credentials: "include",
    headers: {
      [CSRF_HEADER]: token,
    },
    body: formData,
  });

  const body = (await res.json()) as ApiResponse<{ publicUrl: string }>;
  if (!res.ok || body.error || !body.data?.publicUrl) {
    throw new Error(body.error?.message ?? "Upload failed.");
  }
  return body.data.publicUrl;
}

export async function uploadClientFile(file: File): Promise<string> {
  const contentType = resolveContentType(file);

  const sig = await apiPost<{
    uploadType: string;
    url: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    publicUrl?: string;
  }>("/api/tenant/upload/signature", { contentType });

  if (sig.error || !sig.data) {
    throw new Error(sig.error?.message ?? "Upload could not be started.");
  }

  if (sig.data.uploadType === "cloudinary") {
    const formDataObj = new FormData();
    formDataObj.append("file", file);
    formDataObj.append("api_key", sig.data.apiKey);
    formDataObj.append("timestamp", sig.data.timestamp.toString());
    formDataObj.append("signature", sig.data.signature);
    const uploadRes = await fetch(sig.data.url, { method: "POST", body: formDataObj });
    if (!uploadRes.ok) throw new Error("Cloudinary upload failed.");
    const cloudinaryData = await uploadRes.json();
    return cloudinaryData.secure_url as string;
  }

  // S3: browser PUT to presigned MinIO URLs often fails (CORS / unrouted host → "Failed to fetch").
  return uploadViaServerProxy(file);
}
