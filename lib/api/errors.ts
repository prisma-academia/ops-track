import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/guards";
import { fail } from "./respond";
import { logger } from "@/lib/logger";

export function handleError(err: unknown) {
  if (err instanceof AuthError) {
    return fail(err.status, err.status === 401 ? "unauthorized" : "forbidden", err.message);
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return fail(400, "validation_error", `${first?.path.join(".") ?? "input"}: ${first?.message ?? "invalid"}`);
  }
  if (err instanceof DomainError) {
    return fail(err.status, err.code, err.message);
  }
  logger.error({ err }, "unhandled_api_error");
  return fail(500, "server_error", "Something went wrong.");
}

export class DomainError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
