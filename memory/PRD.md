# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional.

## Tech Stack
- **Frontend**: React, React Router, TailwindCSS, Shadcn UI, Recharts, Axios, WebSocket
- **Backend**: FastAPI, MongoDB (motor async), Pydantic, JWT auth, openpyxl, WebSocket

## Completed Features

### Phase 1 - Core Platform
- JWT Auth + auto-team "Acuity-Professional"
- Workspaces, Folders, Boards, Groups, Items
- Column CRUD with types: text, status, person, date, numbers, priority, tags, checkbox, link
- Board sharing, comments, context menu (duplicate, move, delete, export)
- Shareable join link (/join/Acuityprofessional)

### Phase 2 - Import/Export & Charts
- Smart Excel Import with group detection
- Import into existing board (append mode)
- Excel Export with group structure + hyperlinks
- Multi-Chart with DB persistence

### Phase 3 - Table UX
- Column headers per group, Checkboxes, Insert between rows
- Floating bulk actions bar (Delete, Move to Group)
- Export to Excel in board context menu

### Phase 4 - Advanced Features
- Select All checkbox, Copy/Move to Board
- Favourites (star boards, sidebar section)
- Links column type with auto-hyperlink
- Activity Log (who changed what, when, with Undo)
- Performance pagination (50 items/page)

### Phase 5 - Column Management & Real-time (Apr 24, 2026)
- **Column Resize** — Drag handle on column header right border; width persists to DB
- **Column Reorder** — Drag-and-drop column headers; new order saves to DB
- **Monday.com-style Toolbar** — Search, Person, Filter, Sort, Hide, Group by in horizontal bar
- **Real-time Collaboration** — WebSocket at /api/ws/board/{board_id}; changes broadcast to other users
- **Input Validation** — columns/chart_configs validated before DB write (prevents board corruption)

## Key API Endpoints
- POST /api/import/excel, GET /api/export/excel/{board_id}
- POST /api/boards/{id}/favorite, GET /api/boards/favorites/me
- POST /api/boards/bulk-copy, /bulk-move-board
- POST /api/items/insert-at, /bulk-move, /bulk-delete
- GET /api/activity/board/{id}, POST /api/activity/{id}/undo
- WS /api/ws/board/{board_id} (real-time)
- PUT /api/boards/{id} (columns reorder/resize + validation)

## P1 - Next Tasks
- File column uploads (requires file storage)
- Email notifications for automations

## P2 - Future Tasks
- AI Agent functionality (scaffolded)
- Column-level permissions
- Dashboard widgets

## Testing
- Iterations 1-8: All passed
