/**
 * Database Seed Data for Development
 *
 * Creates sample data across all 5 roles, territories, brands, and accounts.
 * Usage: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

async function main(): Promise<void> {
  console.log('Seeding database...');

  // --- Organization ---
  const org = await prisma.organization.upsert({
    where: { name: 'Haversack Sales' },
    update: {},
    create: {
      name: 'Haversack Sales',
      address_line1: '123 Market Street',
      city: 'Portland',
      state: 'OR',
      zip_code: '97201',
      phone: '503-555-0100',
      website: 'https://haversacksales.com',
      configuration: {
        timezone: 'America/Los_Angeles',
        currency: 'USD',
        fiscalYearStart: '01-01',
      },
    },
  });
  console.log(`  Organization: ${org.name} (${org.id})`);

  // --- Territories ---
  const territories = await Promise.all([
    prisma.territory.upsert({
      where: { tenant_id_name: { tenant_id: org.id, name: 'Portland Metro' } },
      update: {},
      create: {
        tenant_id: org.id,
        name: 'Portland Metro',
        region: 'Pacific Northwest',
        zip_codes: ['97201', '97202', '97203', '97204', '97205'],
        commission_modifier: 1.0,
      },
    }),
    prisma.territory.upsert({
      where: { tenant_id_name: { tenant_id: org.id, name: 'Seattle Metro' } },
      update: {},
      create: {
        tenant_id: org.id,
        name: 'Seattle Metro',
        region: 'Pacific Northwest',
        zip_codes: ['98101', '98102', '98103', '98104', '98105'],
        commission_modifier: 1.1,
      },
    }),
    prisma.territory.upsert({
      where: { tenant_id_name: { tenant_id: org.id, name: 'Eugene-Salem' } },
      update: {},
      create: {
        tenant_id: org.id,
        name: 'Eugene-Salem',
        region: 'Pacific Northwest',
        zip_codes: ['97301', '97302', '97401', '97402', '97403'],
        commission_modifier: 0.95,
      },
    }),
  ]);
  console.log(`  Territories: ${territories.length} created`);

  // --- Users (all 5 roles) ---
  const passwordHash = await bcrypt.hash('password123', BCRYPT_COST);

  const admin = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: org.id, email: 'admin@haversack.com' } },
    update: {},
    create: {
      tenant_id: org.id,
      email: 'admin@haversack.com',
      password_hash: passwordHash,
      first_name: 'Sarah',
      last_name: 'Admin',
      role: 'admin',
    },
  });

  const manager = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: org.id, email: 'manager@haversack.com' } },
    update: {},
    create: {
      tenant_id: org.id,
      email: 'manager@haversack.com',
      password_hash: passwordHash,
      first_name: 'Mike',
      last_name: 'Manager',
      role: 'manager',
    },
  });

  const reps = await Promise.all(
    territories.map(async (territory, idx) => {
      const rep = await prisma.user.upsert({
        where: {
          tenant_id_email: { tenant_id: org.id, email: `rep${idx + 1}@haversack.com` },
        },
        update: {},
        create: {
          tenant_id: org.id,
          email: `rep${idx + 1}@haversack.com`,
          password_hash: passwordHash,
          first_name: ['Alex', 'Jordan', 'Casey'][idx] ?? `Rep${idx + 1}`,
          last_name: ['Portland', 'Seattle', 'Salem'][idx] ?? `Territory${idx + 1}`,
          role: 'rep',
          territory_id: territory.id,
        },
      });

      // Assign rep to territory
      await prisma.territory.update({
        where: { id: territory.id },
        data: { assigned_rep_id: rep.id },
      });

      return rep;
    }),
  );

  const logistics = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: org.id, email: 'logistics@haversack.com' } },
    update: {},
    create: {
      tenant_id: org.id,
      email: 'logistics@haversack.com',
      password_hash: passwordHash,
      first_name: 'Pat',
      last_name: 'Logistics',
      role: 'logistics',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: org.id, email: 'viewer@haversack.com' } },
    update: {},
    create: {
      tenant_id: org.id,
      email: 'viewer@haversack.com',
      password_hash: passwordHash,
      first_name: 'Sam',
      last_name: 'Viewer',
      role: 'viewer',
    },
  });

  console.log(
    `  Users: admin(${admin.id}), manager(${manager.id}), ${reps.length} reps, logistics(${logistics.id}), viewer(${viewer.id})`,
  );

  // --- Brands ---
  const brands = await Promise.all([
    prisma.brand.upsert({
      where: { tenant_id_name: { tenant_id: org.id, name: 'Pacific Honey Co' } },
      update: {},
      create: {
        tenant_id: org.id,
        name: 'Pacific Honey Co',
        principal_contact_name: 'Lisa Chen',
        principal_contact_email: 'lisa@pacifichoney.com',
        base_commission_rate: 10.0,
        default_revenue_model: 'broker',
      },
    }),
    prisma.brand.upsert({
      where: { tenant_id_name: { tenant_id: org.id, name: 'Cascade Preserves' } },
      update: {},
      create: {
        tenant_id: org.id,
        name: 'Cascade Preserves',
        principal_contact_name: 'Tom Rivera',
        principal_contact_email: 'tom@cascadepreserves.com',
        base_commission_rate: 12.0,
        default_revenue_model: 'broker',
      },
    }),
    prisma.brand.upsert({
      where: { tenant_id_name: { tenant_id: org.id, name: 'Mountain Spice Works' } },
      update: {},
      create: {
        tenant_id: org.id,
        name: 'Mountain Spice Works',
        principal_contact_name: 'Ana Martinez',
        principal_contact_email: 'ana@mountainspice.com',
        base_commission_rate: 8.5,
        default_revenue_model: 'wholesale',
      },
    }),
  ]);
  console.log(`  Brands: ${brands.length} created`);

  // --- Products ---
  const products = await Promise.all([
    prisma.product.upsert({
      where: { tenant_id_sku: { tenant_id: org.id, sku: 'PH-WF-001' } },
      update: {},
      create: {
        tenant_id: org.id,
        brand_id: brands[0].id,
        name: 'Wildflower Honey 12oz',
        sku: 'PH-WF-001',
        category: 'Honey',
        unit_price: 12.99,
        wholesale_price: 8.5,
        case_size: '12 x 12oz',
        certifications: ['Organic', 'Non-GMO'],
        allergens: [],
        dietary_attributes: ['Gluten-Free', 'Vegan'],
        revenue_model: 'broker',
      },
    }),
    prisma.product.upsert({
      where: { tenant_id_sku: { tenant_id: org.id, sku: 'CP-SJ-001' } },
      update: {},
      create: {
        tenant_id: org.id,
        brand_id: brands[1].id,
        name: 'Strawberry Jam 8oz',
        sku: 'CP-SJ-001',
        category: 'Preserves',
        subcategory: 'Jam',
        unit_price: 8.99,
        wholesale_price: 5.5,
        case_size: '24 x 8oz',
        certifications: ['Non-GMO'],
        allergens: [],
        dietary_attributes: ['Gluten-Free', 'Vegan'],
        revenue_model: 'broker',
      },
    }),
    prisma.product.upsert({
      where: { tenant_id_sku: { tenant_id: org.id, sku: 'MS-CS-001' } },
      update: {},
      create: {
        tenant_id: org.id,
        brand_id: brands[2].id,
        name: 'Chipotle Seasoning Blend',
        sku: 'MS-CS-001',
        category: 'Spices',
        subcategory: 'Seasoning Blends',
        unit_price: 6.99,
        wholesale_price: 3.75,
        case_size: '48 x 4oz',
        certifications: ['Organic'],
        allergens: [],
        dietary_attributes: ['Gluten-Free', 'Vegan', 'Keto'],
        revenue_model: 'wholesale',
      },
    }),
  ]);
  console.log(`  Products: ${products.length} created`);

  // --- Accounts ---
  const accounts = await Promise.all([
    prisma.account.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        tenant_id: org.id,
        name: 'Fresh Market PDX',
        account_type: 'store',
        address_line1: '456 Hawthorne Blvd',
        city: 'Portland',
        state: 'OR',
        zip_code: '97214',
        phone: '503-555-0201',
        territory_id: territories[0].id,
        assigned_rep_id: reps[0].id,
        health_score: 85,
        health_score_calculated_at: new Date(),
      },
    }),
    prisma.account.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        tenant_id: org.id,
        name: 'Pike Place Bistro',
        account_type: 'restaurant',
        address_line1: '89 Pike Street',
        city: 'Seattle',
        state: 'WA',
        zip_code: '98101',
        phone: '206-555-0301',
        territory_id: territories[1].id,
        assigned_rep_id: reps[1].id,
        health_score: 62,
        health_score_calculated_at: new Date(),
      },
    }),
    prisma.account.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        tenant_id: org.id,
        name: 'Valley Natural Foods',
        account_type: 'distributor',
        address_line1: '200 Commercial St',
        city: 'Salem',
        state: 'OR',
        zip_code: '97301',
        phone: '503-555-0401',
        territory_id: territories[2].id,
        assigned_rep_id: reps[2].id,
        health_score: 45,
        health_score_calculated_at: new Date(),
      },
    }),
  ]);
  console.log(`  Accounts: ${accounts.length} created`);

  // --- Contacts ---
  await Promise.all([
    prisma.contact.create({
      data: {
        tenant_id: org.id,
        account_id: accounts[0].id,
        first_name: 'Maria',
        last_name: 'Garcia',
        email: 'maria@freshmarketpdx.com',
        phone: '503-555-0202',
        title: 'Purchasing Manager',
        is_primary: true,
      },
    }),
    prisma.contact.create({
      data: {
        tenant_id: org.id,
        account_id: accounts[1].id,
        first_name: 'James',
        last_name: 'Kim',
        email: 'james@pikeplacebistro.com',
        phone: '206-555-0302',
        title: 'Head Chef',
        is_primary: true,
      },
    }),
    prisma.contact.create({
      data: {
        tenant_id: org.id,
        account_id: accounts[2].id,
        first_name: 'Linda',
        last_name: 'Nguyen',
        email: 'linda@valleynaturalfoods.com',
        phone: '503-555-0402',
        title: 'Buyer',
        is_primary: true,
      },
    }),
  ]);
  console.log(`  Contacts: 3 created`);

  // --- Commission Rules ---
  await Promise.all(
    brands.map((brand) =>
      prisma.commissionRule.create({
        data: {
          tenant_id: org.id,
          brand_id: brand.id,
          base_rate: brand.base_commission_rate,
          effective_date: new Date('2026-01-01'),
          is_active: true,
        },
      }),
    ),
  );
  console.log(`  Commission Rules: ${brands.length} created`);

  console.log('\nSeeding complete!');
  console.log('  Default password for all users: password123');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
