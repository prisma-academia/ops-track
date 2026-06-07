import { env } from "@/lib/env";

export function tenantHttpOrigin(slug: string): string {
  return `http://${slug}.${env.APP_DOMAIN}`;
}
