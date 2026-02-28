import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const BCRYPT_COST = 12;

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@haversack.com',
    firstName: 'Alex',
    lastName: 'Admin',
    role: UserRole.admin,
    password: 'AdminPass123!',
  },
  {
    email: 'manager@haversack.com',
    firstName: 'Morgan',
    lastName: 'Manager',
    role: UserRole.manager,
    password: 'ManagerPass123!',
  },
  {
    email: 'rep1@haversack.com',
    firstName: 'Riley',
    lastName: 'Rep',
    role: UserRole.rep,
    password: 'RepPass123!',
  },
  {
    email: 'rep2@haversack.com',
    firstName: 'Sam',
    lastName: 'Sales',
    role: UserRole.rep,
    password: 'RepPass123!',
  },
  {
    email: 'logistics@haversack.com',
    firstName: 'Logan',
    lastName: 'Logistics',
    role: UserRole.logistics,
    password: 'LogisticsPass123!',
  },
  {
    email: 'viewer@haversack.com',
    firstName: 'Val',
    lastName: 'Viewer',
    role: UserRole.viewer,
    password: 'ViewerPass123!',
  },
];

interface SeedTerritory {
  name: string;
  region: string;
  zipCodes: string[];
}

const SEED_TERRITORIES: SeedTerritory[] = [
  {
    name: 'Portland Metro',
    region: 'Oregon',
    zipCodes: ['97201', '97202', '97203', '97204', '97205'],
  },
  {
    name: 'Seattle Metro',
    region: 'Washington',
    zipCodes: ['98101', '98102', '98103', '98104', '98105'],
  },
];

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Upsert territories
  const territories = await Promise.all(
    SEED_TERRITORIES.map((t) =>
      prisma.territory.upsert({
        where: {
          tenantId_name: { tenantId: TENANT_ID, name: t.name },
        },
        update: {
          region: t.region,
          zipCodes: t.zipCodes,
        },
        create: {
          tenantId: TENANT_ID,
          name: t.name,
          region: t.region,
          zipCodes: t.zipCodes,
          commissionModifier: 1.0,
        },
      }),
    ),
  );

  console.log(`Created ${territories.length} territories`);

  // Upsert users with hashed passwords
  const users = await Promise.all(
    SEED_USERS.map(async (u) => {
      const passwordHash = await bcrypt.hash(u.password, BCRYPT_COST);
      return prisma.user.upsert({
        where: {
          tenantId_email: { tenantId: TENANT_ID, email: u.email },
        },
        update: {
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
        },
        create: {
          tenantId: TENANT_ID,
          email: u.email,
          passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          isActive: true,
        },
      });
    }),
  );

  console.log(`Created ${users.length} users`);

  // Assign reps to territories (rep1 -> Portland, rep2 -> Seattle)
  const rep1 = users.find((u) => u.email === 'rep1@haversack.com');
  const rep2 = users.find((u) => u.email === 'rep2@haversack.com');
  const portland = territories.find((t) => t.name === 'Portland Metro');
  const seattle = territories.find((t) => t.name === 'Seattle Metro');

  if (rep1 && rep2 && portland && seattle) {
    await Promise.all([
      prisma.userTerritory.upsert({
        where: { userId_territoryId: { userId: rep1.id, territoryId: portland.id } },
        update: {},
        create: { userId: rep1.id, territoryId: portland.id },
      }),
      prisma.userTerritory.upsert({
        where: { userId_territoryId: { userId: rep2.id, territoryId: seattle.id } },
        update: {},
        create: { userId: rep2.id, territoryId: seattle.id },
      }),
    ]);
    console.log('Assigned reps to territories');
  }

  console.log('Seed complete!');
}

main()
  .catch((e: unknown) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
