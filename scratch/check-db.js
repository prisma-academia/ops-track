const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://drtv:your_strong_password_here@13.140.138.147:5434/rafuel-fms',
});

async function main() {
  await client.connect();
  const res = await client.query('SELECT id, email, status FROM "PlatformUser"');
  console.log("Platform Users:", res.rows);
  
  const tenants = await client.query('SELECT id, slug, status FROM "Tenant"');
  console.log("Tenants:", tenants.rows);
  
  const tenantUsers = await client.query('SELECT id, email, "tenantId", status FROM "TenantUser"');
  console.log("Tenant Users:", tenantUsers.rows);
  
  await client.end();
}

main().catch(console.error);
