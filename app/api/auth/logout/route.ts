import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { readSessionToken, revokeSession, COOKIE_NAMES } from "@/lib/auth/session";
import { resolveHost } from "@/lib/auth/context";
import { isProd } from "@/lib/env";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const h = await headers();
    const ctx = resolveHost(h.get("host"));
    const logoutCtx = h.get("x-logout-context");
    const isAdmin = logoutCtx === "tenant-admin";

    let cookieName: string;
    if (ctx.mode === "platform") {
      const token = await readSessionToken("PLATFORM");
      if (token) await revokeSession(token);
      cookieName = COOKIE_NAMES.platform;
    } else if (isAdmin) {
      const token = await readSessionToken("TENANT");
      if (token) await revokeSession(token);
      cookieName = COOKIE_NAMES.tenant;
    } else {
      const token = await readSessionToken("CLIENT");
      if (token) await revokeSession(token);
      cookieName = COOKIE_NAMES.client;
    }

    const res = NextResponse.json({ data: { ok: true }, error: null }, { status: 200 });
    res.cookies.set({
      name: cookieName,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
    return res;
  } catch (e) {
    return handleError(e);
  }
}
