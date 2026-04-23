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
│   ├── .env (MONGO_URL, DB_NAME)
│   ├── database.py
│   ├── models.py (User, Board w/ chart_configs, Group, Item w/ position, Folder, etc.)
│   ├── auth.py
│   ├── requirements.txt
│   ├── server.py
│   └── routes/
│       ├── import_routes.py (group detection, append mode)
│       ├── export_routes.py (Excel export)
│       ├── board_routes.py (chart_configs persistence)
│       ├── item_routes.py (bulk-move, bulk-delete, insert-at)
│       ├── group_routes.py
│       ├── auth_routes.py
│       ├── team_routes.py
│       └── ...
└── frontend
    ├── .env (REACT_APP_BACKEND_URL)
    └── src
        ├── App.js
        ├── contexts/ (AuthContext, WorkspaceContext)
        ├── components/board/
        │   ├── TableView.jsx (checkboxes, per-group headers, insert-between, bulk actions)
        │   ├── ChartView.jsx (multi-chart with auto-save)
        │   ├── BoardContextMenu.jsx (export to Excel option)
        │   └── cells/
        └── pages/
            ├── BoardPage.jsx (Export button)
            ├── ImportDialog.jsx (new/existing board toggle)
            └── ...
```

## What's Been Implemented

### Phase 1 - Core Platform (Complete)
- JWT Auth with auto-team assignment to "Acuity-Professional"
- Workspaces, Folders, Boards with customizable columns
- Groups, Items, Column CRUD operations
- Status/Priority column label customization
- Board sharing with team members
- Comments/Updates on items
- Board context menu (duplicate, move, delete)
- Shareable team invite link (/join/Acuityprofessional)
- Acuity Professional logo branding

### Phase 2 - Import/Export & Charts (Complete - Apr 23, 2026)
- Enhanced Excel Import with smart group detection
- Import into Existing Board (append mode)
- Excel Export (GET /api/export/excel/{board_id})
- Multi-Chart with DB Persistence

### Phase 3 - Monday.com Table UX (Complete - Apr 23, 2026)
- **Column headers per group**: Each group shows its own column header row (ITEM, PERSON, NBR, etc.) below the group name — matches monday.com layout
- **Checkboxes on items**: Replaced 3-dot menu with checkboxes for multi-select
- **Floating bulk actions bar**: When items are selected, a dark bar appears at bottom with Delete, Move to (group dropdown), and deselect
- **Insert row between items**: Hover between rows shows a "+" button to insert at specific position (backend shifts positions)
- **Export to Excel in context menu**: The board "..." menu now includes "Export to Excel" option
- **Bulk move items**: Move selected items between groups
- **Bulk delete items**: Delete multiple items at once

## Key DB Schema
- `boards`: {id, name, workspace_id, columns, chart_configs, owner_id, member_ids}
- `groups`: {id, board_id, title, color, position}
- `items`: {id, board_id, group_id, name, column_values, position, created_by}

## Key API Endpoints
- POST /api/import/excel (new board or append to existing)
- GET /api/export/excel/{board_id} (download .xlsx)
- POST /api/items/insert-at (insert at position, shifts others)
- POST /api/items/bulk-move (move items between groups)
- POST /api/items/bulk-delete (delete multiple items)
- PUT /api/boards/{board_id} (supports chart_configs)

## P1 - Next Tasks
- Activity log population across all CRUD endpoints
- File column uploads (requires object storage integration)
- Email notifications for automations

## P2 - Future Tasks
- AI Agent functionality (currently scaffolded/mocked)
- Refined permissions (column-level restrictions)
- Dashboard widgets enhancement

## Testing
- Iterations 1-4: Core platform (all passed)
- Iteration 5: Import groups, export, chart persistence (11/11 backend, 100% frontend)
- Iteration 6: Table UX enhancements - checkboxes, bulk ops, per-group headers (11/11 backend, 5/5 frontend)
