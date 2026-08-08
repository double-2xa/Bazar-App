-- Nice Price Bazar - PostgreSQL 18 least-privilege roles
-- Run in pgAdmin while connected to the application database.
-- Run as the database/schema owner or a PostgreSQL administrator.
-- Passwords are intentionally NOT stored in this file. Set them afterward in
-- pgAdmin: Login/Group Roles -> role -> Properties -> Definition -> Password.

BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '5min';

DO $$
BEGIN
  IF current_setting('server_version_num')::integer < 180000 THEN
    RAISE EXCEPTION 'PostgreSQL 18 or newer is required; connected server is %', version();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'bazardb') THEN
    RAISE EXCEPTION 'Schema bazardb does not exist in database %. Run the database bootstrap first.', current_database();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'Bazar') THEN
    CREATE ROLE "Bazar" LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bazar_muteren') THEN
    CREATE ROLE bazar_muteren LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bazar_read') THEN
    CREATE ROLE bazar_read LOGIN;
  END IF;
END
$$;

-- Enforce safe role attributes even if one of these roles already existed.
ALTER ROLE "Bazar" NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE bazar_muteren NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
ALTER ROLE bazar_read NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

-- Connect only to the current application database. This does not grant
-- access to any other database on the PostgreSQL server.
DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO "Bazar", bazar_muteren, bazar_read',
    current_database()
  );
  EXECUTE format(
    'ALTER ROLE "Bazar" IN DATABASE %I SET search_path = bazardb, public',
    current_database()
  );
  EXECUTE format(
    'ALTER ROLE bazar_muteren IN DATABASE %I SET search_path = bazardb, public',
    current_database()
  );
  EXECUTE format(
    'ALTER ROLE bazar_read IN DATABASE %I SET search_path = bazardb, public',
    current_database()
  );
END
$$;

-- Bazar owns application schema objects and is intended for Prisma migrations.
-- The API runtime must NOT use this account.
DO $$
DECLARE
  object_name text;
BEGIN
  FOR object_name IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'bazardb' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('ALTER TABLE bazardb.%I OWNER TO "Bazar"', object_name);
  END LOOP;

  FOR object_name IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'bazardb' AND c.relkind = 'S'
  LOOP
    EXECUTE format('ALTER SEQUENCE bazardb.%I OWNER TO "Bazar"', object_name);
  END LOOP;
END
$$;

ALTER TYPE bazardb."UserRole" OWNER TO "Bazar";
ALTER TYPE bazardb."CompanyStatus" OWNER TO "Bazar";
ALTER TYPE bazardb."PriceType" OWNER TO "Bazar";
ALTER TYPE bazardb."OrderStatus" OWNER TO "Bazar";
ALTER TYPE bazardb."PaymentMethod" OWNER TO "Bazar";
ALTER TYPE bazardb."PaymentStatus" OWNER TO "Bazar";
ALTER TYPE bazardb."CouponType" OWNER TO "Bazar";
ALTER SCHEMA bazardb OWNER TO "Bazar";

-- Remove implicit application-schema/object privileges from PUBLIC.
REVOKE ALL ON SCHEMA bazardb FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA bazardb FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA bazardb FROM PUBLIC;

-- Schema owner / migration account.
GRANT USAGE, CREATE ON SCHEMA bazardb TO "Bazar";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA bazardb TO "Bazar";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA bazardb TO "Bazar";

-- Runtime read/write account: data access only, no CREATE, TRUNCATE,
-- REFERENCES, TRIGGER, MAINTAIN, ownership, or grant option.
GRANT USAGE ON SCHEMA bazardb TO bazar_muteren;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA bazardb TO bazar_muteren;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA bazardb TO bazar_muteren;

-- Reporting/read-only account.
GRANT USAGE ON SCHEMA bazardb TO bazar_read;
GRANT SELECT ON ALL TABLES IN SCHEMA bazardb TO bazar_read;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA bazardb TO bazar_read;
ALTER ROLE bazar_read SET default_transaction_read_only = on;

-- Explicit enum usage for both non-owner accounts.
GRANT USAGE ON TYPE bazardb."UserRole" TO bazar_muteren, bazar_read;
GRANT USAGE ON TYPE bazardb."CompanyStatus" TO bazar_muteren, bazar_read;
GRANT USAGE ON TYPE bazardb."PriceType" TO bazar_muteren, bazar_read;
GRANT USAGE ON TYPE bazardb."OrderStatus" TO bazar_muteren, bazar_read;
GRANT USAGE ON TYPE bazardb."PaymentMethod" TO bazar_muteren, bazar_read;
GRANT USAGE ON TYPE bazardb."PaymentStatus" TO bazar_muteren, bazar_read;
GRANT USAGE ON TYPE bazardb."CouponType" TO bazar_muteren, bazar_read;

-- pg_trgm may be installed in bazardb by the bootstrap. Application users
-- need EXECUTE to use its search operators, but cannot replace its functions.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA bazardb TO bazar_muteren, bazar_read;

-- Future objects created by Bazar (for example through Prisma migrations)
-- automatically receive the same least-privilege access.
ALTER DEFAULT PRIVILEGES FOR ROLE "Bazar" IN SCHEMA bazardb
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bazar_muteren;
ALTER DEFAULT PRIVILEGES FOR ROLE "Bazar" IN SCHEMA bazardb
  GRANT SELECT ON TABLES TO bazar_read;
ALTER DEFAULT PRIVILEGES FOR ROLE "Bazar" IN SCHEMA bazardb
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO bazar_muteren;
ALTER DEFAULT PRIVILEGES FOR ROLE "Bazar" IN SCHEMA bazardb
  GRANT SELECT ON SEQUENCES TO bazar_read;
ALTER DEFAULT PRIVILEGES FOR ROLE "Bazar" IN SCHEMA bazardb
  GRANT USAGE ON TYPES TO bazar_muteren, bazar_read;
ALTER DEFAULT PRIVILEGES FOR ROLE "Bazar" IN SCHEMA bazardb
  GRANT EXECUTE ON ROUTINES TO bazar_muteren, bazar_read;

COMMIT;

-- Verification: owner should be Bazar, bazar_muteren should have four data
-- privileges per table, and bazar_read should have SELECT only.
SELECT n.nspname AS schema_name, r.rolname AS schema_owner
FROM pg_namespace n
JOIN pg_roles r ON r.oid = n.nspowner
WHERE n.nspname = 'bazardb';

SELECT grantee, privilege_type, count(*) AS object_count
FROM information_schema.role_table_grants
WHERE table_schema = 'bazardb'
  AND grantee IN ('Bazar', 'bazar_muteren', 'bazar_read')
GROUP BY grantee, privilege_type
ORDER BY grantee, privilege_type;
