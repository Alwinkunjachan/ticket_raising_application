# Linear Clone - Ticket Raising Application

A full-stack issue tracking application inspired by [Linear](https://linear.app), built with Angular 19 and Express.js. Manage projects, issues, cycles (sprints), and labels through a modern, responsive UI powered by Angular Material.

## Tech Stack

| Layer      | Technology                                                  |
| ---------- | ----------------------------------------------------------- |
| Frontend   | Angular 19, Angular Material 19, TypeScript 5.7             |
| Backend    | Express 4, TypeScript 5.7, Sequelize 6, Zod                 |
| Auth       | Passport.js, JWT (access + refresh tokens), bcryptjs         |
| OAuth      | Google OAuth 2.0 via passport-google-oauth20                 |
| Database   | PostgreSQL                                                   |
| Tooling    | Angular CLI, Nodemon, ts-node                                |

## Features

- **Authentication** - Local login (email/password) and Google SSO with JWT-based session management
- **Projects** - Create and manage projects with unique identifiers (e.g., `PROJ`)
- **Issues** - Full lifecycle management with auto-generated keys (`PROJ-1`, `PROJ-2`)
- **Cycles** - Time-boxed sprints with automatic completion and issue rollback
- **Labels** - Global color-coded labels for categorization
- **Members** - Assign issues to team members
- **Filtering** - Filter issues by status, priority, assignee, cycle, and label
- **Theming** - Dark and light mode with persistent preference

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- Angular CLI (`npm install -g @angular/cli`)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd Ticket_raising_application

# Configure environment
cp .env.example server/.env
# Edit server/.env with your PostgreSQL credentials and JWT secrets

# Install dependencies
cd server && npm install
cd ../client && npm install

# Start the backend (runs on port 3000)
cd ../server && npm run dev

# Start the frontend (runs on port 4200)
cd ../client && ng serve
```

Open [http://localhost:4200](http://localhost:4200) in your browser. You will be redirected to the login page.

**Default credentials** (seeded on first startup):
- Email: `alwin@example.com` / Password: `password123`
- Email: `jane@example.com` / Password: `password123`
- Email: `bob@example.com` / Password: `password123`

## Project Structure

```
Ticket_raising_application/
├── client/                  # Angular frontend
│   └── src/
│       └── app/
│           ├── core/        # Services, models, interceptors, guards
│           ├── features/    # Feature modules (auth, issues, projects, cycles, labels)
│           ├── layout/      # Layout shell (sidebar, toolbar)
│           └── shared/      # Reusable components and pipes
├── server/                  # Express backend
│   └── src/
│       ├── config/          # Database, environment, and Passport config
│       ├── controllers/     # Route handlers
│       ├── middleware/       # Auth, error handling, and validation
│       ├── models/          # Sequelize models
│       ├── routes/          # API route definitions
│       ├── services/        # Business logic layer
│       ├── utils/           # JWT helpers, ApiError
│       └── validators/      # Zod validation schemas
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md      # System architecture
│   ├── API.md               # REST API reference
│   ├── DATABASE.md          # Database schema
│   ├── FRONTEND.md          # Frontend architecture
│   └── SETUP.md             # Detailed setup guide
└── .env.example             # Environment template
```

## Documentation

| Document                          | Description                          |
| --------------------------------- | ------------------------------------ |
| [Architecture](docs/ARCHITECTURE.md) | System design and component overview |
| [API Reference](docs/API.md)         | REST API endpoints and payloads      |
| [Database Schema](docs/DATABASE.md)  | Models, associations, and ERD        |
| [Frontend Guide](docs/FRONTEND.md)   | Angular architecture and components  |
| [Setup Guide](docs/SETUP.md)         | Installation and configuration       |

## Scripts

### Server

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `npm run dev`    | Start dev server with hot reload  |
| `npm run build`  | Compile TypeScript to JavaScript  |
| `npm start`      | Run compiled production build     |

### Client

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `ng serve`       | Start dev server on port 4200     |
| `ng build`       | Production build                  |
| `ng test`        | Run unit tests via Karma          |

## License

This project is for educational and demonstration purposes.
