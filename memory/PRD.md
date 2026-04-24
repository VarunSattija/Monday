# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional.

## Tech Stack
- **Frontend**: React, React Router, TailwindCSS, Shadcn UI, Recharts, Axios, WebSocket
- **Backend**: FastAPI, MongoDB (motor async), Pydantic, JWT auth, openpyxl, WebSocket, httpx

## Completed Features

### Phase 1 - Core Platform
- JWT Auth + auto-team, Workspaces, Folders, Boards, Groups, Items
- Column types: text, status, person, date, numbers, priority, tags, checkbox, link, formula
- Board sharing, comments, duplicate/move/delete, shareable join link

### Phase 2 - Import/Export & Charts
- Smart Excel Import with group detection + append mode
- Excel Export with hyperlinks
- Multi-Chart with DB persistence

### Phase 3 - Table UX
- Column headers per group, Checkboxes, Insert between rows
- Bulk actions (Delete, Move to Group, Copy/Move to Board)

### Phase 4 - Advanced Features
- Select All, Favourites, Activity Log with Undo
- Links column, Performance pagination

### Phase 5 - Column Management & Real-time
- Column Resize/Reorder, Monday.com-style Toolbar
- Real-time Collaboration via WebSocket

### Phase 6 - Numbers, Formulas & Summary
- Number columns with £/$/ €/% currency
- Formula column (SUM, AVG, arithmetic)
- Group summary rows with sum totals

### Phase 7 - Notifications & Email (Apr 24, 2026)
- **In-App Notifications Panel** — Bell icon with red unread badge. Slide-out panel with All/Mentioned/Assigned tabs, search, unread only toggle, mark as read/mark all. Shows board invites, team invites, and item comments with avatar, actor name, timestamp.
- **Email Infrastructure** — Ready for Resend or SendGrid. When API key is added to backend/.env (RESEND_API_KEY or SENDGRID_API_KEY), invite emails will send automatically with branded HTML templates.
- **Notification Triggers**: Board invite, Team invite, Item comments (notifies all board members except the commenter)
- **Auth Fix**: get_current_user now returns name from DB lookup (not just token data)

## Key API Endpoints
- GET /api/notifications/me, GET /api/notifications/me/unread-count
- PUT /api/notifications/{id}/read, PUT /api/notifications/read-all
- All previous endpoints intact

## Email Status
- Infrastructure ready (email_helper.py with Resend + SendGrid support)
- **MOCKED** — No API key configured. Add RESEND_API_KEY or SENDGRID_API_KEY to backend/.env

## P1 - Next Tasks
- File column uploads (file storage)
- Configure email API key for live email delivery

## P2 - Future
- AI Agent functionality
- Column-level permissions
- Dashboard widgets

## Testing: Iterations 1-10 (latest: 8/8 backend + 100% frontend)
