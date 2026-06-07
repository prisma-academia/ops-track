import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

let cached: Transporter | null = null;

export function getTransport(): Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return cached;
}

export const FROM = env.SMTP_FROM;
