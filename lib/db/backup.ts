import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { env } from "@/lib/env";

export type DatabaseBackupStream = {
  stream: ReadableStream<Uint8Array>;
  filename: string;
  kill: () => void;
};

function backupFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `opstrack-backup-${stamp}.sql`;
}

/**
 * Streams a plain SQL dump via pg_dump. Requires `pg_dump` on the app server PATH.
 */
export function createDatabaseBackupStream(): DatabaseBackupStream {
  const child = spawn(
    "pg_dump",
    ["--dbname", env.DATABASE_URL, "--no-owner", "--no-acl", "--format=plain"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  if (!child.stdout) {
    child.kill();
    throw new Error("Failed to start database backup process.");
  }

  child.on("error", () => {
    child.kill();
  });

  return {
    stream: Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
    filename: backupFilename(),
    kill: () => child.kill("SIGTERM"),
  };
}
