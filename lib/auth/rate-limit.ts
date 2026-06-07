import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { DomainError } from "@/lib/api/errors";

const WINDOW_MS = 1000 * 60 * 15;
const MAX_FAILURES = 10;
const LOCKOUT_MS = 1000 * 60 * 15;

export type LoginScope = "platform" | "tenant-admin" | "tenant-client";

export async function recordLoginAttempt(
  identifier: string,
  scope: LoginScope,
  success: boolean,
  ip: string | null
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { identifier, scope, success, ip: ip ?? null },
  });
}

export async function shouldLockAccount(
  identifier: string,
  scope: LoginScope
): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const recentFailures = await prisma.loginAttempt.count({
    where: { identifier, scope, success: false, createdAt: { gte: since } },
  });
  return recentFailures >= MAX_FAILURES;
}

export function computeLockoutUntil(): Date {
  return new Date(Date.now() + LOCKOUT_MS);
}

export function isLocked(lockedUntil: Date | null | undefined): boolean {
  if (!lockedUntil) return false;
  return lockedUntil.getTime() > Date.now();
}

/* -------------------------------------------------------------------------- */
/* Upstash sliding-window rate limiting for auth endpoints (PRD §11, §16.4).   */
/*                                                                            */
/* Fails OPEN: if Upstash is unconfigured or unreachable, requests proceed —   */
/* the DB LoginAttempt lockout above is the durable backstop for credentials,  */
/* and failing closed on a Redis outage would be a self-inflicted DoS.         */
/* -------------------------------------------------------------------------- */

export type RateLimitPreset = {
  name: string;
  limit: number;
  windowSeconds: number;
};

export const RATE_PRESETS = {
  LOGIN: { name: "login", limit: 10, windowSeconds: 15 * 60 },
  OTP_REQUEST: { name: "otp-request", limit: 5, windowSeconds: 10 * 60 },
  FORGOT_PASSWORD: { name: "forgot-password", limit: 5, windowSeconds: 15 * 60 },
  RESET_PASSWORD: { name: "reset-password", limit: 10, windowSeconds: 15 * 60 },
  CHANGE_PASSWORD: { name: "change-password", limit: 10, windowSeconds: 15 * 60 },
  REGISTER: { name: "register", limit: 5, windowSeconds: 30 * 60 },
} as const satisfies Record<string, RateLimitPreset>;

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (!env.RATE_LIMIT_ENABLED) return null;
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

function getLimiter(preset: RateLimitPreset): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  let limiter = limiters.get(preset.name);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(preset.limit, `${preset.windowSeconds} s`),
      prefix: `rl:${preset.name}`,
      analytics: false,
    });
    limiters.set(preset.name, limiter);
  }
  return limiter;
}

/**
 * Enforce a sliding-window limit. Throws DomainError(429) when the caller is
 * over the limit. Fails open (returns) if Upstash is unconfigured/unreachable.
 *
 * `keyParts` are joined to form the bucket key — pass e.g. [ip, identifier].
 */
export async function enforceRateLimit(
  preset: RateLimitPreset,
  keyParts: Array<string | null | undefined>
): Promise<void> {
  const limiter = getLimiter(preset);
  if (!limiter) return;
  const key = keyParts.filter(Boolean).join("|") || "anon";
  try {
    const { success } = await limiter.limit(key);
    if (!success) {
      throw new DomainError(
        429,
        "rate_limited",
        "Too many requests. Please wait a few minutes and try again."
      );
    }
  } catch (e) {
    if (e instanceof DomainError) throw e;
    logger.warn({ err: e, preset: preset.name }, "rate_limit_check_failed_open");
  }
}
