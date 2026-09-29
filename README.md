# CollabDocs

A real-time collaborative text editor: multiple people edit the same document at the same
time, with per-character conflict resolution (a CRDT), live cursors, presence, and
per-document sharing (view/edit, or a public link).

- **Backend** - Java 21, Spring Boot 3, Spring Security (JWT), STOMP over WebSocket, PostgreSQL, Flyway.
- **Frontend** - React 18 + Vite, Tailwind CSS, Quill (editor), `@stomp/stompjs`.
- **Sync engine** - a Fugue-style CRDT (`backend/.../engine/Crdt.java` on the server,
  `frontend/src/lib/clientCrdt.js` on the client): every character is a node with a stable id;
  concurrent inserts at the same position are ordered deterministically, so every replica
  converges without locking or a central "last writer wins".

## Quick start (Docker)

```bash
cp .env.example .env        # then set JWT_SECRET_KEY, e.g.:  echo "JWT_SECRET_KEY=$(openssl rand -base64 48)" >> .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:8080 (schema is created automatically by Flyway)

## Running locally without Docker

**Database**
```bash
createdb texteditor   # or: docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16-alpine
```

**Backend**
```bash
cd backend
export JWT_SECRET_KEY=$(openssl rand -base64 48)
./mvnw spring-boot:run                       # add -Dspring-boot.run.profiles=dev to use a built-in dev secret instead
```
Flyway applies `src/main/resources/db/migration/V1__init_schema.sql` on startup.
See `src/main/resources/application.yml` for every configurable value (`DB_URL`, `DB_USERNAME`,
`DB_PASSWORD`, `JWT_EXPIRATION_MS`, `AUTOSAVE_INTERVAL_MS`, `FRONTEND_URL`, `PORT`).

**Frontend**
```bash
cd frontend
cp .env.example .env.local   # defaults already point at http://localhost:8080
npm install
npm run dev                  # http://localhost:5173
```

## Project layout

```
backend/    Spring Boot API + WebSocket server + CRDT engine
frontend/   React SPA (dashboard, editor)
database/   schema.sql (reference copy of the Flyway migration), seed.sql, reset.sql
```

## Database

The schema (`database/schema.sql`, applied automatically by the backend via Flyway) has three tables:

- **users** - account + credentials (BCrypt-hashed password), case-insensitive unique username/email.
- **documents** - one row per document: owner, title, a binary CRDT snapshot (`content`), a plain-text
  `preview` for the dashboard, and `general_access` (`PRIVATE` / `ANYONE_VIEW` / `ANYONE_EDIT`).
- **document_collaborators** - who else a document is shared with, and at what permission
  (`VIEW` / `EDIT`); the owner is not duplicated here.

```bash
psql -U postgres -d texteditor -f database/seed.sql    # optional demo data (users alice/bob/carol, password Password@123)
psql -U postgres -d texteditor -f database/reset.sql    # wipe everything, dev only
```

## Other features worth knowing about

- **API docs** - once the backend is running, browse `/swagger-ui.html` for interactive API docs
  (use the "Authorize" button with a JWT from `/api/auth/login` to try authenticated endpoints).
- **Health check** - `/actuator/health` for container/orchestrator monitoring.
- **Login/registration rate limiting** - a lightweight in-memory guard (15 attempts / 5 minutes per
  IP) protects `/api/auth/login` and `/api/auth/register` from brute-forcing; see
  `security/RateLimitFilter.java`.
- **Export** - any document can be downloaded as a `.txt` file, from the dashboard's "..." menu or
  the download button in the editor toolbar.
- CI (`.github/workflows/ci.yml`) builds and tests both the backend (`mvnw verify`) and the
  frontend (lint, unit tests, production build) on every push and pull request.

## Testing

```bash
cd backend && ./mvnw test         # CRDT engine unit tests (JUnit)
cd frontend && npm test           # client-side CRDT unit tests (node --test)
cd frontend && npm run lint
```

## How real-time sync works, briefly

1. Every character typed becomes an `insert` (or `delete`/`format`) operation carrying the ids of
   its left/right neighbour at the time of typing.
2. The operation is sent over the document's WebSocket topic; the server integrates it into its
   copy of the CRDT and re-broadcasts it (tagged with a sequence number) to everyone viewing that
   document, including a permission check (view-only users cannot publish edits).
3. Each browser applies the same integration algorithm, so two people typing in the same spot at
   the same time always end up with the same final text - no character is silently dropped or
   duplicated.
4. The server periodically (and on last-viewer-leaves) flattens the CRDT into a compact snapshot
   and writes it to `documents.content`; a joining client replays that snapshot instead of
   replaying every keystroke in the document's history.
