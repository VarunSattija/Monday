# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional.

## Tech Stack
- **Frontend**: React, React Router, TailwindCSS, Shadcn UI, Recharts, Axios
- **Backend**: FastAPI, MongoDB (motor async), Pydantic, JWT auth, openpyxl

## Architecture
```
/app
├── backend
│   ├── routes/
│   │   ├── import_routes.py (group detection, append, link type detection)
│   │   ├── export_routes.py (Excel export with hyperlinks)
│   │   ├── board_routes.py (favorites, bulk-copy, bulk-move-board)
│   │   ├── item_routes.py (bulk ops, insert-at, activity logging)
│   │   ├── activity_routes.py (get activities, undo)
│   │   ├── activity_helper.py (log_activity helper)
│   │   └── ...
│   └── models.py (Board w/ chart_configs, ColumnType w/ LINK)
└── frontend
    └── src
        ├── components/board/
        │   ├── TableView.jsx (select all, bulk ops, pagination, link cell)
        │   ├── ChartView.jsx (multi-chart, auto-save)
        │   ├── ActivityLog.jsx (monday.com style with undo)
        │   ├── BoardContextMenu.jsx (export to Excel)
        │   └── cells/LinkCell.jsx (clickable hyperlinks)
        ├── components/layout/Sidebar.jsx (favourites section)
        └── pages/ImportDialog.jsx (new/existing board toggle)
```

## Completed Features

### Phase 1 - Core Platform
- JWT Auth + auto-team "Acuity-Professional"
- Workspaces, Folders, Boards, Groups, Items
- Column CRUD with types: text, status, person, date, numbers, priority, tags, checkbox, link
- Board sharing, comments, context menu (duplicate, move, delete, export)
- Shareable join link (/join/Acuityprofessional)
- Acuity Professional logo branding

### Phase 2 - Import/Export & Charts (Apr 23, 2026)
- Smart Excel Import with group detection from blank-row separators
- Import into existing board (append mode)
- Excel Export with group structure and hyperlinked URLs
- Multi-Chart with DB persistence (auto-save)

### Phase 3 - Table UX (Apr 23, 2026)
- Column headers per group
- Checkboxes on items (replaced 3-dot menu)
- Insert row between items with "+" hover button
- Floating bulk actions bar (Delete, Move to Group)
- Export to Excel in board context menu

### Phase 4 - Advanced Features (Apr 24, 2026)
- **Select All checkbox** in group column header
- **Copy to Board / Move to Board** in bulk actions bar
- **Favourites** — Star boards, Favourites section in sidebar
- **Links column type** — Auto-hyperlinked URLs, clickable in table, hyperlinked in Excel export
- **Activity Log** — Tracks every change: user, item, column, old→new value, timestamp, Undo support
- **Performance** — Paginated groups (50 items/page with "Show more" button)

## Key API Endpoints
- POST /api/import/excel (group detection, append mode)
- GET /api/export/excel/{board_id} (with hyperlinks)
- POST /api/boards/{board_id}/favorite (toggle)
- GET /api/boards/favorites/me
- POST /api/boards/bulk-copy (copy items to another board)
- POST /api/boards/bulk-move-board (move items to another board)
- POST /api/items/insert-at, /bulk-move, /bulk-delete
- GET /api/activity/board/{board_id}
- POST /api/activity/{id}/undo

## P1 - Next Tasks
- File column uploads (requires file storage)
- Email notifications for automations

## P2 - Future Tasks
- AI Agent functionality (scaffolded)
- Column-level permissions
- Dashboard widgets

## Testing History
- Iterations 1-7: All passed (18/18 backend + 6/6 frontend in latest)
