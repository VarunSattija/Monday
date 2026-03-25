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

### Column Operations (NEW - Complete)
- **Rename** column via dialog
- **Delete** column (removes column + all data)
- **Sort** items ascending/descending by column
- **Filter** items by column value
- **Collapse** (hide) column
- **Group by** column values
- **Add column to the right** - inserts after selected column
- **Change column type** (text, status, priority, person, date, etc.)
- **Duplicate column** - copies column with data

### Authentication & User Flow (Complete)
- JWT-based Login/Register
- **Auto-add to Acuity-Professional team on signup** (first user = admin, rest = member)
- Previously invited users get their status upgraded to active when they register
- Logo displayed on Login, Register, Sidebar

### Team Management (Complete)
- Team page with member stats (Total, Active, Invited, Removed)
- **Any team member can invite** others by email (not just admin)
- Pending invitations section with status tracking
- Role management (admin/member)
- Remove members functionality
- **Invite from multiple places**: Team page, Home page, Settings Members tab

### Item Comments (Complete)
- Comment icon on each item row with **count badge**
- Slide-in detail dialog with comment feed
- Add/delete comments
- Real-time comment list with user attribution
- Comment count API endpoint (GET /api/updates/counts/board/{board_id})

### Home Page (Complete)
- Welcome section with workspace name
- Quick action cards: Create Board, View Dashboards, Add Automation, **Invite People**
- **Invite People button in header**
- Recent boards grid
- Empty state with CTA

### Navigation (Fixed)
- Sidebar Home -> /workspaces
- Sidebar Boards -> /workspaces
- Sidebar Team -> /team
- All sidebar buttons with data-testid

## Key API Endpoints
- POST /api/auth/register (auto-adds to team)
- POST /api/auth/login
- GET/POST /api/workspaces, /api/boards, /api/items, /api/groups
- PUT /api/boards/{id}/columns/{col_id}?title=X&column_type=Y (rename/change type)
- DELETE /api/boards/{id}/columns/{col_id} (delete column)
- POST /api/boards/{id}/columns/{col_id}/duplicate
- POST /api/boards/{id}/columns?after_column_id=X (add column after)
- POST /api/teams/{id}/invite (any member can invite)
- GET /api/updates/counts/board/{id} (comment counts)

## Testing Status
- Backend: 15/15 (100%) - iteration 2
- Frontend: 14/18 (78%) - iteration 2

## P1 - Next Tasks
- Activity log population (integrate logging into backend CRUD endpoints)
- File column with upload capability (needs object storage integration)
- Email notifications in automations (needs email service)

## P2 - Future Tasks
- Finalize AI Agent functionality
- Column-level and board-level permissions enforcement
- Board duplication with/without items
- Ownership transfer in Settings
