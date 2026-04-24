# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional.

## Tech Stack
- **Frontend**: React, React Router, TailwindCSS, Shadcn UI, Recharts, Axios, WebSocket
- **Backend**: FastAPI, MongoDB (motor async), Pydantic, JWT auth, openpyxl, WebSocket, httpx

## Completed Features (Phases 1-8)

### Core: Auth, Workspaces, Folders, Boards, Groups, Items
### Column Types: text, status, person, date, numbers (£/$/ €/%), priority, tags, checkbox, link, formula
### Import/Export: Excel import with group detection, Excel export with hyperlinks
### Charts: Multi-chart with DB persistence (bar/pie/line)
### Table UX: Column headers per group, checkboxes, insert between rows, bulk actions (delete, move/copy to group/board)
### Column Mgmt: Resize (drag), Reorder (drag-and-drop), Monday.com-style Toolbar (Search/Person/Filter/Sort/Hide/Group by)
### Numbers: Currency settings (£/$/ €/%), Formula column (SUM/AVG/arithmetic), Group summary rows with sum totals
### Advanced: Select All, Favourites (sidebar), Activity Log with Undo, Real-time WebSocket collaboration
### Sharing: Board invite, Team invite, shareable join link (/join/Acuityprofessional)
### Performance: Paginated groups (50 items/page)

### Phase 7 - Notifications & Email (Apr 24, 2026)
- In-App Notifications Panel (bell icon, tabs, search, unread badge, mark read)
- Email Infrastructure (Resend/SendGrid ready, templates built, **MOCKED** - no API key)
- Notification triggers: board invite, team invite, item comments

### Phase 8 - @Mentions in Comments (Apr 24, 2026)
- **@mention dropdown** — Type @ in comment box, dropdown shows team members (avatar, name, email). Excludes current user.
- **Mention insertion** — Click or keyboard select inserts @Name into comment text
- **Mention highlighting** — @mentions render with orange background in comment feed
- **Mention notifications** — Mentioned users get type="mention" notification: "You were mentioned in {item}"
- **Deduped notifications** — Mentioned users get "mention" type; other board members get "update" type (no duplicates)
- **Board members endpoint** — GET /api/boards/{id}/members/list returns [{id, name, email}]

## Key API Endpoints
- GET /api/notifications/me, /me/unread-count, PUT /{id}/read, /read-all
- GET /api/boards/{id}/members/list
- POST /api/updates (with @mention detection)
- All previous endpoints intact

## Email Status: **MOCKED** — Add RESEND_API_KEY or SENDGRID_API_KEY to backend/.env

## P1 - Next Tasks
- File column uploads (file storage)
- Configure email API key

## P2 - Future
- AI Agent functionality, Column-level permissions, Dashboard widgets

## Testing: Iterations 1-11 (latest: 5/5 backend + 100% frontend)
