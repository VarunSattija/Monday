# Acuity Professional - Work Management Platform (monday.com Clone)

## Original Problem Statement
Build a replica of monday.com with the branding (logo and theme) of Acuity Professional.

## Tech Stack
- **Frontend**: React, React Router, TailwindCSS, Shadcn UI, Recharts, Axios
- **Backend**: FastAPI, MongoDB (motor async), Pydantic, JWT auth, openpyxl
- **Database**: MongoDB

## What's Been Implemented

### Import Boards (NEW)
- **Excel import**: Upload .xlsx file → headers become columns → rows become items
- **CSV import**: Upload .csv file → same auto-mapping (works for Monday.com CSV exports)
- Smart column type detection: status, priority, person, date, text
- Auto-extracts unique status/priority labels from data
- Import dialog with drag-and-drop, board name input
- Available from Home page (Import card + header button) and Sidebar

### Editable Board Name (NEW)
- Click board title → inline edit → Enter saves
- Pencil icon hint next to board name

### Workspace Folders (NEW)
- Create folders within a workspace
- Rename/delete folders via context menu
- Move boards into/out of folders
- Sidebar shows folder tree with boards nested inside
- Boards without folders shown separately

### Chart View (NEW - replaces Kanban)
- Add multiple charts per board
- Chart types: Bar, Pie, Line
- Select which column to visualize
- Optional "Group By" secondary column
- Add/remove charts dynamically

### Previous Features (Complete)
- Column operations: Rename, Delete, Sort, Filter, Collapse, Group By, Add Right, Change Type, Duplicate
- Status/Priority labels save to DB
- Board collaboration: Share with Team, Shared boards sidebar
- Team invite from multiple places
- Auto-add to team on signup
- Shareable join link: /join/Acuityprofessional
- Item comments with count badges
- Group rename (click to edit)
- Acuity Professional logo branding

## Key API Endpoints
- POST /api/import/excel (multipart file upload, creates board from Excel/CSV)
- POST /api/folders (create folder)
- GET /api/folders/workspace/{id}
- PUT /api/folders/{id}?name=X (rename)
- DELETE /api/folders/{id}
- PUT /api/folders/boards/{boardId}/move?folder_id=X
- PUT /api/boards/{id} (partial update - name, description, folder_id)

## Testing Status (Iteration 4)
- Backend: 17/17 (100%)
- Frontend: 100% verified

## P1 - Next Tasks
- Activity log population
- File column with upload
- Email notifications in automations

## P2 - Future Tasks
- AI Agent functionality
- Column/board-level permissions
- Board duplication
