import { rawPrisma as prisma } from '@/lib/db/raw-client';

async function main() {
  const suppliers = ['NNPC', 'DANGOTE', 'MARKETERS', 'NNPC Retail Limited', 'MRS Oil Nigeria Plc', 'Conoil Plc', 'Rainoil Limited', 'NIPCO Plc'];
  for (const s of suppliers) {
    await prisma.supplier.upsert({ where: { name: s }, update: {}, create: { name: s } });
  }

  const depots = ['NNPC Warri Depot', 'Rainoil Warri Depot', 'A.A. Rano Depot', 'MRS Depot'];
  for (const d of depots) {
    await prisma.depot.upsert({ where: { name: d }, update: {}, create: { name: d } });
  }

  const transport = ['AA Rano Nigeria Limited', 'BOVAS Group', 'Conoil Plc'];
  for (const t of transport) {
    await prisma.transportCompany.upsert({ where: { name: t }, update: {}, create: { name: t } });
  }

  console.log('Seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
