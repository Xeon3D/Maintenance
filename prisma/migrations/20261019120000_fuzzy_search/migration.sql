-- Fuzzy search over work orders (lib/search.ts): trigram similarity for typos, unaccent so that
-- "condensacao" finds "condensação". Both ship with Postgres (contrib) and are available on Neon.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
