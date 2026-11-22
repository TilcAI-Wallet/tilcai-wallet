-- Run once as an administrator on the intended database. No login credentials are created.
DO $$
DECLARE role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['wallet_migrator','wallet_api','wallet_worker'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS', role_name);
    ELSIF EXISTS (SELECT FROM pg_roles WHERE rolname = role_name AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication OR rolcanlogin OR rolinherit)) THEN
      RAISE EXCEPTION 'Existing role % has unsafe privileges', role_name;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = role_name) THEN
      RAISE EXCEPTION 'Role % must not inherit other roles', role_name;
    END IF;
  END LOOP;
END $$;
SELECT format('GRANT CREATE ON DATABASE %I TO wallet_migrator', current_database()) \gexec
-- The administrator explicitly grants wallet_migrator to the migration login separately.
