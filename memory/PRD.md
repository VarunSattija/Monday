# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional. Full-stack, feature-rich platform.

## Tech Stack
- **Frontend**: React, React Router, TailwindCSS, Shadcn UI, Recharts, Axios
- **Backend**: FastAPI, MongoDB (motor async), Pydantic, JWT auth
- **Database**: MongoDB

## Architecture
```
/app
├── backend/          (FastAPI + MongoDB)
│   ├── server.py     (main app, /api prefix)
│   ├── database.py   (centralized DB connection)
│   ├── models.py     (Pydantic models)
│   ├── auth.py       (JWT auth utilities)
│   └── routes/       (all API route modules)
├── frontend/         (React SPA)
│   └── src/
│       ├── App.js          (routing)
│       ├── config/api.js   (axios instance)
│       ├── contexts/       (Auth, Workspace)
│       ├── components/     (ui, layout, board)
│       └── pages/          (all page components)
```

## What's Been Implemented

### Core Features (Complete)
- Workspaces & Boards with customizable columns (Status, Person, Date, Text, Priority)
- Multiple board views: Table, Kanban, Timeline, Calendar
- Groups and Items management (CRUD)
- Dashboard with chart widgets
- Automations engine (scaffold)
- Settings page with multiple tabs

### Authentication & User Flow (Complete)
- JWT-based Login/Register
- Company selection page after signup (redirects to /select-company)
- Automatic team assignment to "Acuity-Professional" on company selection
- First user becomes admin of the team

### Team Management (Complete)
- Team page with member stats (Total, Active, Invited, Removed)
- Invite members by email (admin-only)
- Pending invitations section
- Role management (admin/member)
- Remove members functionality

### Item Comments (Complete)
- Comment icon on each item row in table view
- Slide-in detail dialog with comment feed
- Add/delete comments
- Real-time comment list with user attribution

### Branding (Complete)
- Acuity Professional logo on Login, Register, Sidebar, Company Selection
- Logo stored at /public/acuity-logo.png (easy to swap/placeholder)
- Orange/amber gradient theme throughout

### Navigation (Fixed)
- Sidebar Home -> /workspaces
- Sidebar Boards -> /workspaces
- Sidebar Team -> /team
- Board context menu, column settings, invite to board

## Key API Endpoints
- POST /api/auth/register, /api/auth/login, /api/auth/select-company
- GET/POST /api/workspaces, /api/boards, /api/items, /api/groups
- POST /api/teams/{id}/invite (invite by email)
- GET /api/teams/by-name/{name}
- POST /api/updates (create comment), GET /api/updates/item/{id}

## Test Credentials
- Test user: admin_75257@acuity.com / Test1234

## P0 - Remaining/Next Tasks
- Activity log population (backend logging integration)
- Settings page member invite (wire to backend)

## P1 - Upcoming Tasks
- Email notifications in automations (needs email service integration)
- Finalize AI Agent functionality (currently scaffolded)

## P2 - Future Tasks
- Column-level and board-level permissions
- File uploads in comments (up to 500MB)
- Board duplication with/without items
- React hooks dependency warnings cleanup
