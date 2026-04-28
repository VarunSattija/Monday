# Acuity Professional - Work Management Platform

## All Completed Features (Phases 1-12)

### Core: Auth (JWT + forgot/reset password), Workspaces, Folders, Boards, Groups, Items, @Mention Comments
### Columns: text, status, person, date, numbers (£/$/ €/%), priority, tags, checkbox, link, formula
### Import/Export: Excel import (group detection, append), Excel export (hyperlinks)
### Charts: Multi-chart (bar/pie/line) with DB persistence
### Table UX: Column headers/group, checkboxes, insert rows, bulk ops, resize, reorder, toolbar
### Numbers: £ currency, Formula (SUM/AVG), Group summary rows
### Collaboration: Real-time WebSocket, @mentions, notifications (bell + panel)
### Email: Microsoft Graph API (M365) integration + Resend/SendGrid fallback
### Activity Log: Full CRUD logging with date+time for compliance
### Automations: Status-change → move-to-group engine
### Permissions: Column-level (owner-only edit, hidden)
### Dashboards: Widgets (Numbers/Chart/Battery), quick stats
### Custom Views: Save/apply/delete filter+sort+group configurations
### Team: Invite anyone, reinvite removed members, remove any member, forgot/reset password

## Email Configuration (Microsoft Graph API)
Add to `/app/backend/.env`:
```
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
SENDER_EMAIL=Varun.sattija@acuityprofessional.com
```

### Azure Setup Steps:
1. Azure Portal → Microsoft Entra ID → App registrations → New registration
2. Note: Application (client) ID and Directory (tenant) ID
3. Certificates & secrets → New client secret → Copy value
4. API permissions → Add → Microsoft Graph → Application permissions → Mail.Send
5. Grant admin consent

## Testing: Iterations 1-15 (all passed)
