-- Optional demo data for local development.  Run AFTER the backend has started once
-- (so Flyway has created the tables):
--     psql -U postgres -d texteditor -f database/seed.sql
-- Demo logins:  alice / Password@123    bob / Password@123    carol / Password@123

INSERT INTO users (username, email, password) VALUES
  ('alice', 'alice@example.com', '$2b$10$Rbfy9OZ29bkZZANTAE3ocuS7SQyvUFaPq7W3DRQ/QYyf.7k/gTD5C'),
  ('bob',   'bob@example.com',   '$2b$10$Rbfy9OZ29bkZZANTAE3ocuS7SQyvUFaPq7W3DRQ/QYyf.7k/gTD5C'),
  ('carol', 'carol@example.com', '$2b$10$Rbfy9OZ29bkZZANTAE3ocuS7SQyvUFaPq7W3DRQ/QYyf.7k/gTD5C')
ON CONFLICT DO NOTHING;

INSERT INTO documents (owner_username, title, preview) VALUES
  ('alice', 'Product roadmap Q4',      ''),
  ('alice', 'Meeting notes',           ''),
  ('bob',   'Design system checklist', '');

-- alice's roadmap: bob can edit, carol can only view
INSERT INTO document_collaborators (doc_id, username, permission)
SELECT d.id, 'bob',   'EDIT' FROM documents d WHERE d.title = 'Product roadmap Q4'
UNION ALL
SELECT d.id, 'carol', 'VIEW' FROM documents d WHERE d.title = 'Product roadmap Q4'
ON CONFLICT DO NOTHING;
