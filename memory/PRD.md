# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional. Full-stack, feature-rich platform.

## Tech Stack
- **Frontend**: React, React Router, TailwindCSS, Shadcn UI, Recharts, Axios
- **Backend**: FastAPI, MongoDB (motor async), Pydantic, JWT auth
- **Database**: MongoDB

## What's Been Implemented

### Shareable Join Link (NEW)
- `/join/Acuityprofessional` — public page for anyone to join the team
- Flexible slug matching (Acuityprofessional, acuity-professional, AcuityProfessional all work)
- Shows team name + member count
- Register or login directly from the join page
- Auto-joins the team after auth, redirects to workspaces
- Previously invited users get upgraded to active on join

### Column Operations (Complete)
- Rename, Delete, Sort (A-Z/Z-A), Filter, Collapse, Group By
- Add Column to Right, Change Column Type, Duplicate Column

### Authentication & Team (Complete)
- JWT Login/Register with auto-add to Acuity-Professional team
- Invite from: Team page, Home page, Settings Members tab
- Any team member can invite (not just admin)

### Core Features (Complete)
- Workspaces, Boards, Groups, Items, Comments with count badges
- Multiple views: Table, Kanban, Timeline, Calendar
- Dashboard, Automations (scaffold), Settings

## Key API Endpoints
- GET /api/teams/join-info/{slug} (public - team info for join page)
- POST /api/teams/join/{slug} (authenticated - join team via link)
- POST /api/auth/register (auto-adds to team)
- PUT /api/boards/{id}/columns/{col_id} (rename/change type)
- DELETE /api/boards/{id}/columns/{col_id}
- POST /api/teams/{id}/invite

## P1 - Next Tasks
- Activity log population
- File column with upload
- Email notifications in automations

## P2 - Future Tasks
- AI Agent functionality
- Column/board-level permissions
- Board duplication
