import { FROM, getTransport } from "./transport";
import { logger } from "@/lib/logger";

export type SendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: SendInput): Promise<void> {
  try {
    await getTransport().sendMail({
      from: FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
    });
  } catch (err) {
    logger.error({ err, to: input.to, subject: input.subject }, "email_send_failed");
    throw err;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
