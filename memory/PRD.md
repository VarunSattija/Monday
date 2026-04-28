# Acuity Professional - Work Management Platform

## All Completed Features (Phases 1-12)

### Core: Auth (JWT + forgot/reset password), Workspaces, Folders, Boards, Groups, Items, @Mention Comments
### Columns: text, status, person, date, numbers (£/$/ €/%), priority, tags, checkbox, link, formula  
### Import/Export: Excel import (group detection, append), Excel export (hyperlinks)
### Charts: Multi-chart (bar/pie/line) with DB persistence
### Table UX: Column headers/group, checkboxes, insert rows, bulk ops, resize, reorder, toolbar
### Numbers: £ currency, Formula (SUM/AVG), Group summary rows
### Collaboration: Real-time WebSocket, @mentions, notifications (bell + panel), email infra (MOCKED)
### Activity Log: Full CRUD logging with date+time+relative for compliance
### Automations: Status-change → move-to-group engine
### Permissions: Column-level (owner-only edit, hidden)
### Dashboards: Widgets (Numbers/Chart/Battery), quick stats
### Custom Views: Save/apply/delete filter+sort+group configurations
### Team: Invite anyone, reinvite removed members, remove any member

### Phase 12 (Apr 28, 2026)
- **Settings on Home page** — /settings route works globally
- **Forgot Password** — Login page link → ForgotPassword page → email with reset token → ResetPassword page. Tokens expire in 1 hour.
- **Reinvite fix** — Removed members can be reinvited (status reset from "removed" to "invited")
- **Activity Log date/time** — Shows full date (28 Apr 2026, 10:45) + relative time (2h ago)

## Email: **MOCKED** — Add RESEND_API_KEY or SENDGRID_API_KEY to backend/.env
## Testing: Iterations 1-15 (latest: 100% backend + 100% frontend)
