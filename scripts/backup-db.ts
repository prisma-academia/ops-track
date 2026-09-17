import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import "dotenv/config";
import { google } from "googleapis";

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL is not defined in environment.");
    process.exit(1);
  }

  let parsed: URL;
  try {
    parsed = new URL(dbUrl);
  } catch {
    console.error("❌ Invalid DATABASE_URL format.");
    process.exit(1);
  }

  const host = parsed.hostname;
  const port = parsed.port || "5432";
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const dbName = parsed.pathname.replace(/^\//, "");

  const backupsDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);

  const backupFile = path.join(backupsDir, `backup_${dbName}_${timestamp}.sql`);

  console.log(`\n📦 Preparing database snapshot for [${dbName}] at ${host}:${port}...`);
  console.log(`📄 Target file: ${backupFile}\n`);

  // Attempt pg_dump
  const envVars = {
    ...process.env,
    PGPASSWORD: password,
  };

  const args = [
    "-h", host,
    "-p", port,
    "-U", user,
    "-d", dbName,
    "-F", "p", // plain text sql
    "-f", backupFile,
  ];


async function uploadToGoogleDrive(filePath: string, fileName: string) {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!credentialsPath || !folderId) {
    console.warn("⚠️  GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_DRIVE_FOLDER_ID not set. Skipping Google Drive upload.");
    return;
  }

  console.log(`\n☁️  Uploading ${fileName} to Google Drive...`);
  
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth });

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };
    
    const media = {
      mimeType: "application/sql",
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
    });

    console.log(`✅ Successfully uploaded to Google Drive (File ID: ${file.data.id})`);
  } catch (error: any) {
    console.error("❌ Failed to upload to Google Drive:", error.message);
  }
}

  try {
    const result = spawnSync("pg_dump", args, {
      env: envVars,
      stdio: "inherit",
      shell: true,
    });

    if (result.status === 0) {
      console.log(`\n✅ Backup successfully saved to:\n   ${backupFile}\n`);
      await uploadToGoogleDrive(backupFile, `backup_${dbName}_${timestamp}.sql`);
      return;
    }
  } catch {
    // pg_dump not installed in PATH
  }

  console.warn("⚠️  'pg_dump' utility not found in system PATH.");
  console.warn("   You can run this backup manually or via Docker:\n");
  console.log(`   # Manual command:`);
  console.log(`   PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} > "${backupFile}"\n`);
  console.log(`   # Docker container command:`);
  console.log(`   docker run --rm -e PGPASSWORD="${password}" postgres:16-alpine pg_dump -h ${host} -p ${port} -U ${user} -d ${dbName} > "${backupFile}"\n`);
}

run().catch((e) => {
  console.error("Error creating backup:", e);
  process.exit(1);
});
