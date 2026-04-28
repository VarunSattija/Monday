# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional.

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn UI, Recharts, Axios, WebSocket
- Backend: FastAPI, MongoDB, JWT auth, openpyxl, httpx

## All Completed Features (Phases 1-10)

### Core
- JWT Auth, auto-team, Workspaces, Folders, Boards, Groups, Items, Comments with @mentions
- Column types: text, status, person, date, numbers (£/$/ €/%), priority, tags, checkbox, link, formula
- Board sharing, context menu, shareable join link, favourites

### Import/Export
- Excel import (group detection, append mode), Excel export (hyperlinks)

### Table UX
- Column headers per group, checkboxes, insert between rows, bulk actions
- Column resize (drag), reorder (drag-and-drop), monday.com toolbar (Search/Person/Filter/Sort/Hide/Group by)

### Data
- Numbers with £ currency, Formula columns (SUM/AVG), Group summary rows with sum totals
- Multi-chart views (bar/pie/line) with DB persistence

### Collaboration
- Real-time WebSocket, @mentions in comments, in-app notifications (bell icon + panel)
- Email infra (Resend/SendGrid ready, MOCKED)
- Activity Log: full CRUD logging for compliance

### Automations
- Status-change → move-to-group automation with full UI builder and execution engine
- Board invite dialog with real members list, owner/member badges, remove button

### Phase 10 — Permissions, Dashboards, Badge Removal (Apr 28, 2026)
- **Removed "Made with Emergent" badge** — Hidden from UI
- **Column-Level Permissions** — Owner can set columns as "Owner only edit" or "Hidden". Enforced in frontend (read-only/hidden rendering for non-owners) and persisted via settings.permissions in backend.
- **Dashboard Widgets**:
  - Numbers widget (count items, sum/average of number columns with £)
  - Chart widget (bar/pie/line from any column)
  - Battery widget (circular progress % for status completion)
  - Widget CRUD (add via dialog, delete with persistence)
  - Quick stats cards for each board (item count + groups)

## Key Endpoints
- DELETE /api/dashboards/{id}/widgets/{widget_id}
- PUT /api/boards/{id}/columns/{col_id} (now handles settings.permissions merge)
- All previous endpoints intact

## Email: **MOCKED** — Add RESEND_API_KEY or SENDGRID_API_KEY to backend/.env

## Next Tasks
- P1: File column uploads, configure email API key
- P2: AI Agent, more automation triggers

## Testing: Iterations 1-13 (latest: 10/10 backend + ~90% frontend)
