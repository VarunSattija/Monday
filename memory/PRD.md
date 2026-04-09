# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional. Full-stack, feature-rich platform.

## Tech Stack
- **Frontend**: React, React Router, TailwindCSS, Shadcn UI, Recharts, Axios
- **Backend**: FastAPI, MongoDB (motor async), Pydantic, JWT auth
- **Database**: MongoDB

## What's Been Implemented

### Core Features (Complete)
- Workspaces, Boards, Groups, Items with full CRUD
- **Inline group rename** — click group title to edit
- Multiple views: Table, Kanban, Timeline, Calendar
- Dashboard with chart widgets
- Column operations: Rename, Delete, Sort, Filter, Collapse, Group By, Add Right, Change Type, Duplicate

### Status/Priority Labels (Fixed)
- Edit labels dialog saves to database via PUT endpoint
- Custom labels persist after refresh
- Labels show correctly in status dropdown

### Board Collaboration (NEW)
- **"Share with Team" button** on board page — shares board with all active team members
- **"Shared with me" section** in sidebar — shows boards shared by others
- Board invite endpoint adds users to member_ids directly
- Shared boards accessible by all team members

### Shareable Join Link
- `/join/Acuityprofessional` — public join page
- Flexible slug matching (case-insensitive, ignores hyphens)
- Register or login from join page → auto-join team

### Authentication & Team (Complete)
- JWT Login/Register with auto-add to Acuity-Professional team
- Invite from: Team page, Home page, Settings, Join link
- Any team member can invite others

### Item Comments (Complete)
- Comment icon per item with count badge
- Slide-in detail dialog with comment feed

## Key API Endpoints
- PUT /api/boards/{id}/columns/{col_id} (body: {options: [...]}) — save labels
- POST /api/boards/{id}/share — share board with all team members
- GET /api/boards/shared/me — get boards shared with current user
- PUT /api/groups/{id} — rename group
- GET/POST /api/teams/join-info/{slug}, /api/teams/join/{slug}

## Testing Status (Latest - Iteration 3)
- Backend: 12/12 (100%)
- Frontend: 3/3 (100%)

## P1 - Next Tasks
- Activity log population
- File column with upload
- Email notifications in automations

## P2 - Future Tasks
- AI Agent functionality
- Column/board-level permissions
- Board duplication
