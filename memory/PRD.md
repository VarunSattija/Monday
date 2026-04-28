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

## Email: Awaiting AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET in backend/.env
## Sender: Varun.sattija@acuityprofessional.com

## Testing: Iterations 1-16 (latest: 100% backend + 100% frontend)
