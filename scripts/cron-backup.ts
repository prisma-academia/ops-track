import cron from "node-cron";
import { spawnSync } from "child_process";

// Run every day at midnight server time
cron.schedule("0 0 * * *", () => {
  console.log(`[${new Date().toISOString()}] Running scheduled database backup...`);
  
  // Use tsx to run the existing backup script
  const result = spawnSync("npx", ["tsx", "scripts/backup-db.ts"], {
    stdio: "inherit",
    shell: true,
  });

  if (result.error) {
    console.error(`[${new Date().toISOString()}] Scheduled backup failed:`, result.error);
  } else {
    console.log(`[${new Date().toISOString()}] Scheduled backup completed with status code ${result.status}`);
  }
});

console.log("⏰ Backup cron job scheduled. It will automatically run every day at midnight.");
