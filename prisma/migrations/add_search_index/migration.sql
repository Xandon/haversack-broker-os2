-- T057: pg_trgm Search Migration
-- Adds trigram-based GIN indexes for fast case-insensitive search on account name and city.
-- These indexes accelerate Prisma's `contains` + `mode: 'insensitive'` queries.
--
-- Apply manually: psql $DATABASE_URL -f prisma/migrations/add_search_index/migration.sql

-- Enable pg_trgm extension for trigram-based fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on account name for fast trigram search
-- Accelerates: WHERE name ILIKE '%query%' and Prisma contains + insensitive
CREATE INDEX IF NOT EXISTS idx_account_name_trgm
  ON accounts USING GIN (name gin_trgm_ops);

-- GIN index on account city for fast trigram search
CREATE INDEX IF NOT EXISTS idx_account_city_trgm
  ON accounts USING GIN (city gin_trgm_ops);
