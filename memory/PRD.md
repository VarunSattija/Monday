# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional.

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn UI, Recharts, Axios, WebSocket
- Backend: FastAPI, MongoDB, JWT auth, openpyxl, httpx

## All Completed Features (Phases 1-11)

### Core
- JWT Auth, auto-team, Workspaces, Folders, Boards, Groups, Items, @Mention Comments
- Column types: text, status, person, date, numbers (£/$/ €/%), priority, tags, checkbox, link, formula

### Import/Export
- Excel import (group detection, append), Excel export (hyperlinks)

### Table UX
- Column headers/group, checkboxes, insert rows, bulk ops, resize, reorder, toolbar

### Data & Charts
- Numbers with £ currency, Formula (SUM/AVG), Group summary rows, Multi-chart (bar/pie/line)

### Collaboration
- Real-time WebSocket, @mentions, in-app notifications (bell icon + panel), email infra (MOCKED)
- Activity Log: full CRUD logging for compliance

### Automations
- Status-change → move-to-group with execution engine

### Permissions & Dashboards
- Column-level (owner-only edit, hidden), Dashboard widgets (Numbers/Chart/Battery)

### Phase 11 — Custom Views, Team Fixes (Apr 28, 2026)
- **Fixed: Team member removal** — Any team member can now remove others (was admin-only). Trash icon visible for all.
- **Fixed: "Only team members can invite" error** — Removed restriction, any authenticated user can invite.
- **Fixed: Duplicate key React warning** — Team members deduplicated by user_id.
- **Fixed: Views dropdown auto-close** — onSelect with preventDefault keeps dropdown open for inline name input.
- **Custom Board Views** — Save current filter/sort/group-by/hidden-columns as a named view. Views button in toolbar shows list of saved views. Click to apply. Delete to remove. Persisted via backend API.

## Key Endpoints
- POST /api/views (create), GET /api/views/board/{id} (list), DELETE /api/views/{id}
- Team invite/remove: no longer requires admin role

## Email: **MOCKED** — Add RESEND_API_KEY or SENDGRID_API_KEY to backend/.env

## Next Tasks
- P1: File column uploads, configure email key
- P2: AI Agent, more automation triggers

## Testing: Iterations 1-14 (latest: 10/10 backend + 90% frontend, bugs fixed)
