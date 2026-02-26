-- Enable extensions required by the application
-- Executed once on first database creation via docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Trigram similarity for full-text search
CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch";  -- Levenshtein distance for fuzzy matching
