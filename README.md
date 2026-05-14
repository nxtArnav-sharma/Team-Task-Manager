# TaskFlow — Team Task Manager

A professional team task management application built with Node.js, Express, and PostgreSQL. Designed for speed and simplicity in team collaboration.

Live URL: [https://team-task-manager.up.railway.app](https://team-task-manager.up.railway.app)

## Tech Stack
- **Backend:** Node.js, Express
- **Database:** PostgreSQL via Prisma ORM
- **Authentication:** JWT (HttpOnly Cookies)
- **Frontend:** Vanilla JS, CSS, HTML

## Features
- User authentication and profile management
- Project creation and team membership
- Role-based permissions (Admin vs Member)
- Real-time task board (Todo, In Progress, Done)
- Task assignments and priority levels
- Dashboard with overdue task tracking and statistics

## Local Setup
```bash
git clone <repository-url>
cd team-task-manager
npm install
# Create .env from .env.example and fill values
npx prisma migrate dev
npm run dev
```

## API Overview
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register new account |
| POST | `/api/auth/login` | No | Login and get token |
| GET | `/api/projects` | Yes | List user's projects |
| POST | `/api/tasks/project/:id` | Yes | Create task (Admin) |
| GET | `/api/tasks/dashboard` | Yes | Get task statistics |

## Role System
TaskFlow uses a simple but effective role system:
- **Admin:** The project creator. Can invite/remove members, create/delete tasks, and edit all task details.
- **Member:** Invited users. Can view all project tasks and update the status of tasks assigned to them.

## Deployment
Deployed on Railway using Nixpacks. Database migrations are handled automatically during deployment via `prisma migrate deploy`.
