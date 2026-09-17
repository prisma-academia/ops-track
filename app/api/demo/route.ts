import { z } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";

// Simple in-memory rate limiter (per-IP, 3 submissions per hour)
const submissionLog = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const log = (submissionLog.get(ip) ?? []).filter((t) => now - t < hour);
  if (log.length >= 3) return true;
  submissionLog.set(ip, [...log, now]);
  return false;
}

const Body = z.object({
  companyName:  z.string().min(1).max(200),
  contactName:  z.string().min(1).max(200),
  email:        z.email(),
  phone:        z.string().max(40).optional(),
  companySize:  z.string().max(20).optional(),
  industry:     z.string().max(100).optional(),
  country:      z.string().max(100).optional(),
  interestedIn: z.array(z.string()).default([]),
  message:      z.string().max(2000).optional(),
  // Honeypot — must be empty
  _hp:          z.string().max(0).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { data: null, error: { code: "rate_limited", message: "Too many submissions. Please try again later." } },
        { status: 429 }
      );
    }

    const raw = await request.json();

    // Honeypot check
    if (raw._hp) {
      return ok({ message: "Received." }); // silently accept bots
    }

    const body = Body.parse(raw);

    const demoRequest = await prisma.demoRequest.create({
      data: {
        companyName:  body.companyName,
        contactName:  body.contactName,
        email:        body.email.toLowerCase(),
        phone:        body.phone ?? null,
        companySize:  body.companySize ?? null,
        industry:     body.industry ?? null,
        country:      body.country ?? null,
        interestedIn: body.interestedIn,
        message:      body.message ?? null,
        status:       "PENDING",
      },
    });

    // Notify platform admin
    try {
      await sendEmail({
        to: env.PLATFORM_ADMIN_EMAIL ?? "admin@opstrack.app",
        subject: `New Demo Request — ${body.companyName}`,
        html: `
          <h2>New Demo Request</h2>
          <p><strong>Company:</strong> ${body.companyName}</p>
          <p><strong>Contact:</strong> ${body.contactName} (${body.email})</p>
          <p><strong>Phone:</strong> ${body.phone ?? "—"}</p>
          <p><strong>Size:</strong> ${body.companySize ?? "—"}</p>
          <p><strong>Industry:</strong> ${body.industry ?? "—"}</p>
          <p><strong>Country:</strong> ${body.country ?? "—"}</p>
          <p><strong>Interested in:</strong> ${body.interestedIn.join(", ") || "—"}</p>
          <p><strong>Message:</strong> ${body.message ?? "—"}</p>
          <p><a href="${env.APP_DOMAIN ? `https://app.${env.APP_DOMAIN}` : ""}/demo-requests/${demoRequest.id}">View in platform admin →</a></p>
        `,
      });
    } catch {
      // Email failure should not block the response
    }

    return ok({ message: "Your request has been received. We will be in touch within 1 business day." }, undefined, 201);
  } catch (e) {
    return handleError(e);
  }
}