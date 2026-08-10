/*
  Bazar shared PostgreSQL server — read-only role/database access audit

  Run the complete script in pgAdmin as a PostgreSQL administrator. It does
  not create, alter, revoke, or grant anything.

  Scope: PostgreSQL SQL roles and database CONNECT privileges only.
  pg_hba.conf is intentionally not evaluated by this audit.
*/

WITH
settings AS (
  SELECT
    'nicepricebazar-ota-db'::text AS allowed_database,
    ARRAY['Bazar', 'bazar_muteren', 'bazar_read']::text[] AS audited_roles
),
expected_roles(role_name) AS (
  SELECT unnest(audited_roles)
  FROM settings
),
role_checks AS (
  SELECT
    expected.role_name,
    role.oid AS role_oid,
    role.rolcanlogin,
    role.rolsuper,
    role.rolcreatedb,
    role.rolcreaterole,
    role.rolreplication,
    role.rolbypassrls
  FROM expected_roles AS expected
  LEFT JOIN pg_catalog.pg_roles AS role
    ON role.rolname = expected.role_name
),
database_checks AS (
  SELECT
    role.role_name,
    database.datname AS database_name,
    database.datname = settings.allowed_database AS is_allowed_database,
    CASE
      WHEN role.role_oid IS NULL THEN false
      ELSE pg_catalog.has_database_privilege(
        role.role_oid,
        database.oid,
        'CONNECT'
      )
    END AS can_connect_by_sql
  FROM role_checks AS role
  CROSS JOIN pg_catalog.pg_database AS database
  CROSS JOIN settings
  WHERE database.datallowconn
    AND NOT database.datistemplate
),
membership_checks AS (
  SELECT
    member.rolname AS role_name,
    string_agg(granted.rolname, ', ' ORDER BY granted.rolname) AS inherited_roles
  FROM pg_catalog.pg_auth_members AS membership
  JOIN pg_catalog.pg_roles AS member
    ON member.oid = membership.member
  JOIN pg_catalog.pg_roles AS granted
    ON granted.oid = membership.roleid
  CROSS JOIN settings
  WHERE member.rolname = ANY (settings.audited_roles)
  GROUP BY member.rolname
),
summary AS (
  SELECT
    role.role_name,
    role.role_oid IS NOT NULL AS role_exists,
    COALESCE(role.rolcanlogin, false) AS can_login,
    COALESCE(bool_or(
      database.is_allowed_database AND database.can_connect_by_sql
    ), false) AS can_connect_to_allowed_database,
    COALESCE(bool_or(
      NOT database.is_allowed_database AND database.can_connect_by_sql
    ), false) AS can_connect_to_other_database,
    COALESCE(string_agg(
      database.database_name,
      ', ' ORDER BY database.database_name
    ) FILTER (
      WHERE NOT database.is_allowed_database
        AND database.can_connect_by_sql
    ), 'none') AS unwanted_database_access,
    concat_ws(', ',
      CASE WHEN role.rolsuper THEN 'SUPERUSER' END,
      CASE WHEN role.rolcreatedb THEN 'CREATEDB' END,
      CASE WHEN role.rolcreaterole THEN 'CREATEROLE' END,
      CASE WHEN role.rolreplication THEN 'REPLICATION' END,
      CASE WHEN role.rolbypassrls THEN 'BYPASSRLS' END
    ) AS elevated_attributes,
    COALESCE(membership.inherited_roles, 'none') AS inherited_roles
  FROM role_checks AS role
  LEFT JOIN database_checks AS database
    ON database.role_name = role.role_name
  LEFT JOIN membership_checks AS membership
    ON membership.role_name = role.role_name
  GROUP BY
    role.role_name,
    role.role_oid,
    role.rolcanlogin,
    role.rolsuper,
    role.rolcreatedb,
    role.rolcreaterole,
    role.rolreplication,
    role.rolbypassrls,
    membership.inherited_roles
)
SELECT
  CASE
    WHEN role_exists
      AND can_login
      AND can_connect_to_allowed_database
      AND NOT can_connect_to_other_database
      AND elevated_attributes = ''
    THEN 'PASS'
    ELSE 'FAIL'
  END AS audit_result,
  role_name,
  role_exists,
  can_login,
  can_connect_to_allowed_database,
  can_connect_to_other_database,
  unwanted_database_access,
  COALESCE(NULLIF(elevated_attributes, ''), 'none') AS elevated_attributes,
  inherited_roles,
  CASE
    WHEN NOT role_exists
      THEN 'Role does not exist.'
    WHEN NOT can_login
      THEN 'Role cannot log in.'
    WHEN NOT can_connect_to_allowed_database
      THEN 'Role cannot connect to nicepricebazar-ota-db.'
    WHEN can_connect_to_other_database
      THEN 'Role has SQL CONNECT privilege on another database.'
    WHEN elevated_attributes <> ''
      THEN 'Role has elevated cluster attributes.'
    ELSE 'SQL role and database CONNECT setup is correctly isolated.'
  END AS explanation
FROM summary
ORDER BY role_name;

/*
  Reading the result
  ------------------
  All three rows must say PASS.

  A common reason for FAIL is PostgreSQL's default CONNECT grant to PUBLIC.
  Because each login is a member of PUBLIC, it can inherit CONNECT even when
  no grant was made directly to that login. The unwanted_database_access
  column lists every affected database.

  This audit answers whether PostgreSQL's SQL privilege system permits a
  connection. A server/network/HBA rule can still reject a permitted login.
*/
