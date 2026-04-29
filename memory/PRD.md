# Acuity Professional - Work Management Platform

## All Completed Features (Phases 1-13)

### Core: Auth (JWT + forgot/reset password), Workspaces, Folders, Boards, Groups, Items, @Mention Comments
### Columns: text, status, person, date, numbers (£/$/ €/%), priority, tags, checkbox, link, formula
### Import/Export: Excel import (group detection, append), Excel export (hyperlinks)
### Charts: Multi-chart (bar/pie/line) with DB persistence
### Table UX: Column headers/group, checkboxes, insert rows, bulk ops, resize, reorder, toolbar
### Numbers: £ currency, Formula (SUM/AVG), Group summary rows
### Collaboration: Real-time WebSocket, @mentions, notifications (bell + panel)
### Email: Microsoft Graph API (M365) + Resend/SendGrid fallback (awaiting Azure keys)
### Activity Log: Full CRUD logging with date+time for compliance
### Automations: Status-change → move-to-group engine
### Permissions: Column-level (owner-only edit, hidden)
### Dashboards: Widgets (Numbers/Chart/Battery), quick stats
### Custom Views: Save/apply/delete filter+sort+group configurations
### Team: Invite anyone, reinvite removed, remove any member, forgot/reset password

### Phase 13 (Apr 28, 2026)
- **Settings removed from board** — No Settings button on board toolbar; accessible via sidebar user dropdown
- **User dropdown menu** — My profile, Administration, Teams, Import data, Log out (red). All with icons and navigation.
- **Board invite: registered users only** — Rejects unregistered emails with clear error message "This email is not registered on the platform. The person must sign up first."

### Phase 14 (Apr 29, 2026)
- **Profile avatar relocated** — Moved user avatar/dropdown from bottom of Sidebar (was overlapping) to top-right of Header (Monday.com style). Full menu (My profile, Administration, Teams, Import data, Log out) remains.
- **Board Form View** — New "Form" tab on each board. Auto-generates a public, shareable form from board columns. Settings: per-field visibility/required toggles, custom labels, target group, success message, enable/disable. Public URL `/f/{form_id}` opens a branded form (no login needed); submission creates an item with required-field validation + automation triggers.
- **Developer API (Personal Access Tokens)** — New "Developer" tab in Settings. Generate scoped tokens (per-user OR per-workspace), revoke anytime, sha256-hashed at rest. Public API at `/api/v1/*`:
  - `GET /api/api-keys/whoami` — verify token
  - `GET /api/v1/boards` — list accessible boards (workspace-scoped if applicable)
  - `GET /api/v1/boards/{id}` — full schema (columns + groups)
  - `POST /api/v1/boards/{id}/items` — create item via API (for CV parser ingestion)
  - Documentation + cURL/Python snippets shown in-app.

## Testing: Iteration 17 — Backend 100% (22/22 pytest), Frontend verified via screenshot + e2e public form submit flow.


## Email: Awaiting AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in backend/.env
## Sender: Varun.sattija@acuityprofessional.com

## Backlog
- (P1) File Column uploads (needs Object Storage integration)
- (P2) AI Agents (currently scaffolded)
- (P2) Board Templates
