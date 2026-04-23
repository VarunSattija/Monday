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
│   ├── models.py (User, Board w/ chart_configs, Group, Item, Folder, etc.)
│   ├── auth.py
│   ├── requirements.txt
│   ├── server.py
│   └── routes/
│       ├── import_routes.py (enhanced: group detection, append mode)
│       ├── export_routes.py (NEW: Excel export)
│       ├── board_routes.py (chart_configs persistence)
│       ├── folder_routes.py
│       ├── group_routes.py
│       ├── item_routes.py
│       ├── auth_routes.py
│       ├── team_routes.py
│       └── ...
└── frontend
    ├── .env (REACT_APP_BACKEND_URL)
    └── src
        ├── App.js
        ├── contexts/ (AuthContext, WorkspaceContext)
        ├── components/board/
        │   ├── ChartView.jsx (multi-chart with auto-save)
        │   ├── TableView.jsx
        │   └── cells/
        └── pages/
            ├── BoardPage.jsx (Export button added)
            ├── ImportDialog.jsx (new/existing board toggle)
            └── ...
```

## What's Been Implemented

### Phase 1 - Core Platform (Complete)
- JWT Auth with auto-team assignment to "Acuity-Professional"
- Workspaces, Folders, Boards with customizable columns
- Groups, Items, Column CRUD operations
- Table view with inline editing
- Status/Priority column label customization
- Board sharing with team members
- Comments/Updates on items
- Board context menu (duplicate, move, delete)
- Shareable team invite link (/join/Acuityprofessional)
- Acuity Professional logo branding

### Phase 2 - Import/Export & Charts (Complete - Apr 23, 2026)
- **Enhanced Excel Import**: Smart group detection from blank-row separators in Excel files. Tested with real Pipeline file - correctly detects 4 groups (Pipeline, Completed, NFA, Enquiry - Working On) with 203 items.
- **Import into Existing Board**: Append mode with column matching (case-insensitive). Creates new columns for unmatched headers. Authorization check included.
- **Excel Export**: GET /api/export/excel/{board_id} generates .xlsx with group structure, styled headers, and auto-column widths.
- **Multi-Chart with Persistence**: Add/remove multiple charts per board, select column/type/groupBy. Charts auto-save to DB (chart_configs field on Board model).
- **Export Button**: Added to BoardPage actions bar.

## Key DB Schema
- `users`: {id, email, hashed_password, name, team_id}
- `teams`: {id, name, slug, members: [{user_id, role, status}]}
- `folders`: {id, name, workspace_id, owner_id}
- `boards`: {id, name, workspace_id, folder_id, columns, chart_configs, owner_id, member_ids}
- `groups`: {id, board_id, title, color, position}
- `items`: {id, board_id, group_id, name, column_values, created_by}

## Key API Endpoints
- POST /api/import/excel?workspace_id=X&board_name=Y (new board)
- POST /api/import/excel?workspace_id=X&existing_board_id=Z (append)
- GET /api/export/excel/{board_id} (download .xlsx)
- PUT /api/boards/{board_id} (supports chart_configs field)

## P1 - Next Tasks
- Activity log population across all CRUD endpoints
- File column uploads (requires object storage integration)
- Email notifications for automations

## P2 - Future Tasks
- AI Agent functionality (currently scaffolded/mocked)
- Refined permissions (column-level restrictions)
- Dashboard widgets enhancement

## Bug Fixes History
- DateCell crash on invalid dates (RangeError) — fixed with robust parsing
- Import crash to blank page — fixed
- Group rename, status label save, board sharing — all fixed

## Testing
- Iterations 1-4: Core platform features (all passed)
- Iteration 5: Import groups, export, chart persistence (11/11 backend, 100% frontend)
