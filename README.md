# CollabDocs

> A real-time collaborative document editor that allows multiple users to work on the same document simultaneously with conflict-free synchronization.

CollabDocs is a full-stack collaborative text editor built with **React, Spring Boot, PostgreSQL, WebSockets, JWT authentication, and CRDT-based synchronization**.

Multiple users can open the same document, edit it simultaneously, see active collaborators and live cursors, and share documents with different permissions.

---

## 🚀 Features

### 🔐 Authentication & Security

- User registration and login
- JWT-based authentication
- BCrypt password hashing
- Protected API endpoints
- Login and registration rate limiting
- Session-based authentication on the frontend

### 📝 Document Management

- Create documents
- Edit documents
- Delete documents
- View documents from dashboard
- Document preview
- Autosave support
- Export documents as `.txt`

### 🤝 Real-Time Collaboration

- Multiple users can edit the same document simultaneously
- Real-time synchronization using WebSockets
- Live cursor positions
- Active user presence
- Concurrent editing support
- Conflict-free synchronization using a CRDT

### 🔗 Document Sharing

Documents can be shared using different access levels:

- `PRIVATE`
- `ANYONE_VIEW`
- `ANYONE_EDIT`
- Individual collaborator permissions
- `VIEW` permission
- `EDIT` permission
- Public document links

### 🎨 User Interface

- React-based single-page application
- Tailwind CSS
- Responsive dashboard
- Rich text editing
- Dark/light theme support
- User menu and profile interface
- Keyboard shortcuts
- Loading indicators and modals

### 🧪 Testing & CI

- Backend JUnit tests
- Frontend CRDT tests
- ESLint
- Production frontend build
- GitHub Actions CI pipeline
- Automated backend and frontend verification

---

# 🛠️ Tech Stack

## Frontend

- React 18
- Vite
- JavaScript
- Tailwind CSS
- Quill Editor
- STOMP.js
- WebSocket
- Node.js
- npm

## Backend

- Java 21
- Spring Boot 3
- Spring Security
- Spring Data JPA
- JWT
- STOMP
- WebSocket
- Maven
- Flyway

## Database

- PostgreSQL

## Testing

- JUnit
- Node.js Test Runner
- ESLint

## DevOps

- Docker
- Docker Compose
- GitHub Actions
- Nginx

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │       Browser        │
                         │      React App       │
                         └──────────┬───────────┘
                                    │
                         HTTP / REST API
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Spring Boot       │
                         │       Backend        │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
             REST Controllers                  WebSocket
                    │                         STOMP Messaging
                    │                                │
                    ▼                                ▼
             ┌─────────────┐                ┌──────────────┐
             │ PostgreSQL  │                │ CRDT Engine  │
             └─────────────┘                └──────────────┘
```

---

# 🔄 How Real-Time Collaboration Works

CollabDocs uses a **CRDT (Conflict-free Replicated Data Type)** based synchronization approach.

The basic flow is:

```text
User types a character
        ↓
Client creates CRDT operation
        ↓
Operation sent through WebSocket
        ↓
Spring Boot WebSocket server
        ↓
CRDT operation integrated
        ↓
Operation broadcast to collaborators
        ↓
Other clients apply the operation
        ↓
All replicas converge to the same document
```

Each character is represented using a stable identifier.

When multiple users make changes at the same time, the CRDT algorithm deterministically orders concurrent operations so that the document eventually reaches the same state on every connected client.

This avoids relying on a simple **last-write-wins** strategy.

---

# 📁 Project Structure

```text
CollabDocs/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   └── resources/
│   │   └── test/
│   │
│   ├── pom.xml
│   ├── mvnw
│   └── mvnw.cmd
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   └── App.jsx
│   │
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── reset.sql
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── docker-compose.yml
├── .env.example
├── LICENSE
└── README.md
```

---

# 🗄️ Database Design

The application uses PostgreSQL.

The main entities are:

### Users

Stores registered users and authentication information.

```text
users
├── id
├── username
├── email
└── password
```

Passwords are stored using BCrypt hashing.

### Documents

Stores document information.

```text
documents
├── id
├── owner
├── title
├── content
├── preview
└── general_access
```

The document content contains the CRDT snapshot used for restoring the collaborative document state.

### Document Collaborators

Stores document-sharing permissions.

```text
document_collaborators
├── document
├── user
└── permission
```

Supported permissions include:

```text
VIEW
EDIT
```

---

# ⚙️ Prerequisites

Before running the project locally, install:

- Java 21
- Node.js
- npm
- PostgreSQL
- Git
- Docker Desktop *(optional but recommended)*

Verify installations:

```bash
java -version
node -v
npm -v
psql --version
git --version
docker --version
```

---

# 🚀 Running with Docker

The easiest way to start the complete application is Docker Compose.

### 1. Clone the repository

```bash
git clone https://github.com/aman123-morya/CollabDocs.git
```

```bash
cd CollabDocs
```

### 2. Create environment file

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the required environment variables.

### 3. Start the application

```bash
docker compose up --build
```

The application will start the required services.

### Frontend

```text
http://localhost:5173
```

### Backend

```text
http://localhost:8080
```

---

# 💻 Running Without Docker

## 1. Start PostgreSQL

Create the database:

```bash
createdb texteditor
```

Or create it through PostgreSQL:

```sql
CREATE DATABASE texteditor;
```

---

# 🔧 Backend Setup

Navigate to the backend:

```bash
cd backend
```

Set the JWT secret.

Linux/macOS:

```bash
export JWT_SECRET_KEY="your-secure-secret"
```

Windows PowerShell:

```powershell
$env:JWT_SECRET_KEY="your-secure-secret"
```

Start Spring Boot:

Linux/macOS:

```bash
./mvnw spring-boot:run
```

Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

The backend will run on:

```text
http://localhost:8080
```

Flyway automatically applies the database migrations when the application starts.

---

# 🌐 Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create the local environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Start the development server:

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

---

# 🔑 Environment Variables

Never commit real secrets to GitHub.

Use:

```text
.env
.env.local
```

for local configuration.

The repository contains:

```text
.env.example
```

as a template.

Typical backend configuration includes:

```text
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET_KEY
JWT_EXPIRATION_MS
AUTOSAVE_INTERVAL_MS
FRONTEND_URL
PORT
```

The actual values should be configured locally or through the deployment environment.

---

# 🧪 Testing

## Backend Tests

From the `backend` directory:

```bash
./mvnw test
```

Windows:

```powershell
.\mvnw.cmd test
```

---

## Frontend Tests

From the `frontend` directory:

```bash
npm test
```

---

## Lint

```bash
npm run lint
```

---

## Production Build

```bash
npm run build
```

---

# 🔍 API Documentation

When the backend is running, Swagger UI can be accessed at:

```text
http://localhost:8080/swagger-ui.html
```

The API documentation allows developers to explore and test available REST endpoints.

---

# ❤️ Health Check

The backend exposes an Actuator health endpoint:

```text
http://localhost:8080/actuator/health
```

This can be used for monitoring application health.

---

# 🔄 CI/CD

The project includes a GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

The CI pipeline checks the application on pushes and pull requests.

It performs tasks such as:

```text
Backend
├── Maven verification
└── Tests

Frontend
├── Lint
├── Unit tests
└── Production build
```

---

# 🐳 Docker

The project supports Docker-based development.

Start the complete application:

```bash
docker compose up --build
```

Stop the application:

```bash
docker compose down
```

---

# 🔒 Security

The application includes several security mechanisms:

- JWT authentication
- BCrypt password hashing
- Protected API endpoints
- Document-level permissions
- View/Edit access control
- Login rate limiting
- Environment-based secret configuration

**Do not commit production passwords, JWT secrets, database credentials, or API keys to GitHub.**

---

# 📤 Export Documents

Users can export documents as `.txt` files.

The export option is available from the dashboard and editor interface.

---

# 🎯 Use Cases

CollabDocs can be used for:

- Collaborative note taking
- Team documentation
- Shared meeting notes
- Project documentation
- Educational collaboration
- Real-time writing
- Technical documentation
- Remote team collaboration

---

# 📌 Future Improvements

Possible future enhancements include:

- Google/GitHub OAuth login
- Version history
- Document revision timeline
- Comments and mentions
- File attachments
- Richer formatting tools
- Offline editing
- Advanced user roles
- Notifications
- Document search
- Cloud deployment
- Horizontal WebSocket scaling

---

# 👨‍💻 Author

**Aman Kumar**

Full-Stack Web Development Project

### Technologies

```text
Java
Spring Boot
React
JavaScript
PostgreSQL
WebSocket
JWT
CRDT
Docker
GitHub Actions
```

---

# 📄 License

This project is available under the license included in the repository.

---

## ⭐ If you find this project useful

Consider starring the repository on GitHub.

```text
https://github.com/aman123-morya/CollabDocs
```
