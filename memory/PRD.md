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

### Phase 15 (Apr 29, 2026)
- **TOTP Two-Factor Authentication** — Settings → General → 2FA section. Setup with QR code (Google Authenticator / Microsoft Authenticator / Authy / 1Password) → 6-digit verification → 10 backup codes generated. Login flow auto-detects 2FA enabled and prompts for code (or backup code, which is consumed on use). Disable requires password + valid code. Endpoints: `/api/auth/2fa/{setup,enable,disable,status,verify-challenge,regenerate-backup-codes}`. Replaces previous stubbed "Enable" button.
- **Acuity SDK (Python + JavaScript)** — Drop-in client libraries mirroring monday.com SDK shape:
  - `acuity.api.boards.list/get`, `acuity.api.items.create`, `acuity.api.whoami`
  - `acuity.storage.get/set/delete/keys` — key/value app storage scoped per-user or per-workspace via `/api/v1/storage`
  - `acuity.events.on_board(id, cb)` (Python) / `acuity.listen(id, cb)` (JS) — WebSocket subscriptions to live board events
  - `acuity.auth.login(email, password, totp?)` — handles 2FA challenge automatically
  - Distributed via `/api/sdk/{python,javascript,javascript/cdn,readme}`. Download buttons + sample code in Developer tab.

## Testing: Iteration 18 — Backend 100% (20/20 pytest), Frontend 100%, no bugs.

### Phase 16 (Apr 29, 2026)
- **Resizable sidebar** — Drag the right edge to resize between 220–480px. Width persists in localStorage. Double-click handle to reset. Lets users see long board names + per-board kebab menu.
- **Drag & drop boards into folders** — Each sidebar board is HTML5 draggable. Drop on a folder header to move into it (orange ring highlight on hover). Drop on the BOARDS root area to remove from a folder. Empty folders show "Drop a board here" hint.
- **Move-to-folder in board "..." menu** — BoardContextMenu now has a "Move to folder" submenu (workspace's folders + "Remove from folder" when applicable). Original "Move to" submenu renamed to "Move to workspace" for clarity. Sidebar tree refreshes immediately on move.

## Testing: Iteration 19 — Frontend 100% (8/8), no bugs.


## Email: Awaiting AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in backend/.env
## Sender: Varun.sattija@acuityprofessional.com

## Backlog
- (P1) File Column uploads (needs Object Storage integration)
- (P2) AI Agents (currently scaffolded)
- (P2) Board Templates
