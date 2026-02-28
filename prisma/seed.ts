import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

const TENANT_ID = '00000000-0000-4000-a000-000000000001';
const BCRYPT_COST = 12;

async function main(): Promise<void> {
  console.log('Seeding database...');

  // Create tenant organization
  await prisma.organization.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'Haversack Sales',
      addressLine1: '123 NW Food Ave',
      city: 'Portland',
      state: 'OR',
      zipCode: '97209',
      phone: '503-555-0001',
      website: 'https://haversacksales.com',
    },
  });

  // Create territories
  const territories = [
    { id: '00000000-0000-4000-a000-000000000010', name: 'Portland Metro', region: 'Oregon' },
    { id: '00000000-0000-4000-a000-000000000011', name: 'Seattle Metro', region: 'Washington' },
    { id: '00000000-0000-4000-a000-000000000012', name: 'Eugene/Salem', region: 'Oregon' },
  ];

  for (const t of territories) {
    await prisma.territory.upsert({
      where: { id: t.id },
      update: {},
      create: { ...t, tenantId: TENANT_ID },
    });
  }

  // Create users with hashed passwords
  const userDefs = [
    {
      idx: '00',
      email: 'admin@haversack.com',
      password: 'AdminPass123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin' as const,
      territoryId: undefined as string | undefined,
    },
    {
      idx: '01',
      email: 'manager@haversack.com',
      password: 'ManagerPass123!',
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager' as const,
      territoryId: undefined as string | undefined,
    },
    {
      idx: '02',
      email: 'rep1@haversack.com',
      password: 'RepPass123!',
      firstName: 'Rep',
      lastName: 'One',
      role: 'rep' as const,
      territoryId: territories[0].id,
    },
    {
      idx: '03',
      email: 'rep2@haversack.com',
      password: 'RepPass123!',
      firstName: 'Rep',
      lastName: 'Two',
      role: 'rep' as const,
      territoryId: territories[1].id,
    },
    {
      idx: '04',
      email: 'logistics@haversack.com',
      password: 'LogisticsPass123!',
      firstName: 'Logistics',
      lastName: 'User',
      role: 'logistics' as const,
      territoryId: undefined as string | undefined,
    },
    {
      idx: '05',
      email: 'viewer@haversack.com',
      password: 'ViewerPass123!',
      firstName: 'Viewer',
      lastName: 'User',
      role: 'viewer' as const,
      territoryId: undefined as string | undefined,
    },
  ];

  const userIds: string[] = [];
  for (const u of userDefs) {
    const id = `${TENANT_ID.slice(0, -2)}${u.idx}`;
    userIds.push(id);
    const passwordHash = await hash(u.password, BCRYPT_COST);
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId: TENANT_ID,
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        territoryId: u.territoryId,
      },
    });
  }

  // Rep user IDs for assignment
  const rep1Id = userIds[2]; // rep1
  const rep2Id = userIds[3]; // rep2

  // Create brands
  const brands = [
    {
      id: '00000000-0000-4000-a000-000000000020',
      name: 'Olympia Coffee',
      defaultRevenueModel: 'broker' as const,
      baseCommissionRate: 12.0,
      description: 'Premium Pacific Northwest coffee roaster',
    },
    {
      id: '00000000-0000-4000-a000-000000000021',
      name: 'Jacobsen Salt Co',
      defaultRevenueModel: 'wholesale' as const,
      baseCommissionRate: 10.0,
      description: 'Artisan sea salt from the Oregon coast',
    },
    {
      id: '00000000-0000-4000-a000-000000000022',
      name: 'Bee Local',
      defaultRevenueModel: 'broker' as const,
      baseCommissionRate: 15.0,
      description: 'Portland-sourced local honey',
    },
  ];

  for (const b of brands) {
    await prisma.brand.upsert({
      where: { id: b.id },
      update: {},
      create: { ...b, tenantId: TENANT_ID, isActive: true },
    });
  }

  // Create products
  const products = [
    {
      id: '00000000-0000-4000-a000-000000000030',
      name: 'Olympia Coffee - Little Brother Blend',
      sku: 'OC-LBB-12',
      brandId: brands[0].id,
      category: 'Coffee',
      unitPrice: 14.99,
      availabilityStatus: 'in_stock' as const,
      revenueModel: 'broker' as const,
    },
    {
      id: '00000000-0000-4000-a000-000000000031',
      name: 'Jacobsen Salt - Flake Sea Salt',
      sku: 'JS-FSS-4',
      brandId: brands[1].id,
      category: 'Condiments',
      unitPrice: 12.5,
      availabilityStatus: 'in_stock' as const,
      revenueModel: 'wholesale' as const,
    },
    {
      id: '00000000-0000-4000-a000-000000000032',
      name: 'Bee Local - Wildflower Honey',
      sku: 'BL-WFH-16',
      brandId: brands[2].id,
      category: 'Sweeteners',
      unitPrice: 18.0,
      availabilityStatus: 'in_stock' as const,
      revenueModel: 'broker' as const,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, tenantId: TENANT_ID, isActive: true },
    });
  }

  // Create accounts
  const accountDefs = [
    {
      idx: '40',
      name: 'New Seasons Market',
      accountType: 'store' as const,
      addressLine1: '1954 SE Division St',
      city: 'Portland',
      state: 'OR',
      zipCode: '97202',
      phone: '503-555-0100',
      email: 'buying@newseasons.com',
      territoryId: territories[0].id,
      assignedRepId: rep1Id,
    },
    {
      idx: '41',
      name: 'Metropolitan Market',
      accountType: 'store' as const,
      addressLine1: '100 Mercer St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98109',
      phone: '206-555-0200',
      email: 'purchasing@metmarket.com',
      territoryId: territories[1].id,
      assignedRepId: rep2Id,
    },
    {
      idx: '42',
      name: 'Uwajimaya',
      accountType: 'store' as const,
      addressLine1: '600 5th Ave S',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98104',
      phone: '206-555-0300',
      email: 'imports@uwajimaya.com',
      territoryId: territories[1].id,
      assignedRepId: rep2Id,
    },
    {
      idx: '43',
      name: "Zupan's Markets",
      accountType: 'store' as const,
      addressLine1: '2340 W Burnside St',
      city: 'Portland',
      state: 'OR',
      zipCode: '97210',
      phone: '503-555-0400',
      email: 'orders@zupans.com',
      territoryId: territories[0].id,
      assignedRepId: rep1Id,
    },
  ];

  for (const a of accountDefs) {
    const id = `00000000-0000-4000-a000-0000000000${a.idx}`;
    await prisma.account.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId: TENANT_ID,
        name: a.name,
        accountType: a.accountType,
        addressLine1: a.addressLine1,
        city: a.city,
        state: a.state,
        zipCode: a.zipCode,
        phone: a.phone,
        email: a.email,
        territoryId: a.territoryId,
        assignedRepId: a.assignedRepId,
      },
    });

    // Create a primary contact for each account
    const contactId = `00000000-0000-4000-a000-0000000000${(parseInt(a.idx) + 10).toString()}`;
    await prisma.contact.upsert({
      where: { id: contactId },
      update: {},
      create: {
        id: contactId,
        accountId: id,
        tenantId: TENANT_ID,
        firstName: 'Buyer',
        lastName: a.name.split(' ')[0],
        email: a.email,
        phone: a.phone,
        isPrimary: true,
        title: 'Purchasing Manager',
      },
    });
  }

  console.log('Seed completed successfully.');
  console.log(`  Organization: 1`);
  console.log(`  Territories: ${territories.length}`);
  console.log(`  Users: ${userDefs.length}`);
  console.log(`  Brands: ${brands.length}`);
  console.log(`  Products: ${products.length}`);
  console.log(`  Accounts: ${accountDefs.length}`);
  console.log(`  Contacts: ${accountDefs.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
