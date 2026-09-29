-- DANGER: wipes every table of the app (including Flyway history) so the backend can
-- rebuild the schema from scratch on next start.  Development only.
DROP TABLE IF EXISTS document_collaborators, documents, users, flyway_schema_history CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
