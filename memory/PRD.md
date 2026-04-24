# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional.

## Tech Stack
- **Frontend**: React, React Router, TailwindCSS, Shadcn UI, Recharts, Axios, WebSocket
- **Backend**: FastAPI, MongoDB (motor async), Pydantic, JWT auth, openpyxl, WebSocket

## Completed Features

### Phase 1 - Core Platform
- JWT Auth + auto-team, Workspaces, Folders, Boards, Groups, Items
- Column types: text, status, person, date, numbers, priority, tags, checkbox, link, formula
- Board sharing, comments, duplicate/move/delete, shareable join link

### Phase 2 - Import/Export & Charts
- Smart Excel Import with group detection + append mode
- Excel Export with hyperlinks for link columns
- Multi-Chart with DB persistence

### Phase 3 - Table UX
- Column headers per group, Checkboxes, Insert between rows
- Bulk actions (Delete, Move to Group, Copy/Move to Board)
- Export to Excel in context menu

### Phase 4 - Advanced Features
- Select All, Favourites (sidebar section), Activity Log with Undo
- Links column (auto-hyperlink), Performance pagination (50/page)

### Phase 5 - Column Management & Real-time
- Column Resize (drag handle, persisted), Column Reorder (drag-and-drop)
- Monday.com-style Toolbar (Search/Person/Filter/Sort/Hide/Group by)
- Real-time Collaboration via WebSocket

### Phase 6 - Numbers, Formulas & Summary (Apr 24, 2026)
- **Number Column with Currency** — Unit selector (None/$/ €/£/%), Decimal places (Auto/0/1/2), Direction (L/R). Default £. Numbers display formatted (e.g., £1,296)
- **Formula Column** — Users enter expressions like `SUM(Exc. Proc, Exc. Fee)` or `col1 - col2`. Supports SUM(), AVG(), arithmetic (+,-,*,/). Auto-evaluates from other column values.
- **Group Summary Row** — Bottom of each group shows sum totals for all number columns with £ format and "Sum" label
- **Column Migration** — Existing Pipeline fee columns migrated from text → numbers with £ settings
- **Import Enhancement** — guess_column_type now detects number columns by header keywords (fee, amount, price, proc, broker, etc.)

## Key API Endpoints
All endpoints from previous phases plus:
- POST /api/boards/{id}/columns (now supports settings: {unit, decimals, direction} for numbers, {expression, unit} for formula)

## P1 - Next Tasks
- File column uploads (file storage)
- Email notifications for automations

## P2 - Future
- AI Agent functionality
- Column-level permissions
- Dashboard widgets

## Testing: Iterations 1-9 (latest: 4/5 backend + 100% frontend)
