# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional.

## Tech Stack
- Frontend: React, TailwindCSS, Shadcn UI, Recharts, Axios, WebSocket
- Backend: FastAPI, MongoDB, JWT auth, openpyxl, httpx

## Completed Features (Phases 1-9)

### Core: Auth, Workspaces, Folders, Boards, Groups, Items, Comments with @mentions
### Columns: text, status, person, date, numbers (£/$/ €/%), priority, tags, checkbox, link, formula
### Import/Export: Excel import (group detection, append), Excel export (hyperlinks)
### Charts: Multi-chart (bar/pie/line) with DB persistence
### Table UX: Column headers per group, checkboxes, insert rows, bulk actions, column resize/reorder
### Toolbar: Search, Person, Filter, Sort, Hide, Group by
### Numbers: Currency, Formula (SUM/AVG), Group summary rows
### Notifications: Bell icon + panel (All/Mentioned/Assigned), @mention detection
### Email: Resend/SendGrid ready (MOCKED - no key)
### Sharing: Board invite, Team invite, join link
### Real-time: WebSocket collaboration
### Favourites: Star boards, sidebar section
### Activity Log: Full CRUD logging (create, delete, rename, update, bulk move, automation)

### Phase 9 — Board Invite + Automations + Activity Log (Apr 28, 2026)
- **Board Invite Dialog Redesign** — Shows real board members from API with avatar, name, email, owner crown + badge, member badge + X remove button. Email invite with notification.
- **Status-Change Automation** — "When [Status Column] changes to [Value] → Move item to [Group]". Full UI with board picker, status column dropdown, value picker (from column options), target group selector. Backend automation engine runs on every item update and auto-moves items.
- **Complete Activity Log** — Now logs: item create, item delete, column value changes, name changes, bulk moves, automation-triggered moves (logged as user "Automation"). Essential for compliance.
- **Automation Engine** — Backend `automation_engine.py` with `run_automations_for_item()` called from `update_item`. Supports `move_to_group`, `change_status`, `send_notification` actions.

## Key Endpoints
- POST /api/automations (with trigger_config + action_config)
- Automation engine runs inline on PUT /api/items/{id}
- All activity types logged to GET /api/activity/board/{id}

## Email: **MOCKED** — Add RESEND_API_KEY or SENDGRID_API_KEY to backend/.env

## P1 - Next
- File column uploads, Configure email API key

## P2 - Future
- AI Agent, Column-level permissions, Dashboard widgets

## Testing: Iterations 1-12 (latest: 8/8 backend + 100% frontend)
