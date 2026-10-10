# Kishwar Operational & Production Readiness Guide

This document outlines deployment requirements, database backup procedures, credential management, notification troubleshooting, and disaster recovery strategies for the Kishwar Event Management System.

---

## 1. System Dependencies & Architecture

- **Web Framework**: Next.js 14 (App Router, Server Actions)
- **Database**: PostgreSQL (managed via Supabase & Prisma ORM)
- **Object Storage**: Supabase Private Storage (`kishwar-registration-evidence` bucket)
- **Authentication**: Session-based cookie auth with role enforcement (`SUPER_ADMIN`, `AMBASSADOR`, `FDO`, `PARTICIPANT`)
- **Hosting Platform**: Vercel / Node.js Serverless Container

---

## 2. Environment Variables & Credentials Management

The following environment variables must be configured in your production hosting platform dashboard (e.g. Vercel / AWS App Runner):

### Critical Dependencies (Mandatory)
| Variable Name | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled endpoint for serverless execution) |
| `DIRECT_URL` | Direct PostgreSQL connection string (used for schema migrations) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret service role key for private storage admin client |
| `NEXT_PUBLIC_SITE_URL` | Canonical public URL (e.g. `https://kishwar.org`) |

### Notification Providers (Optional)
| Variable Name | Description |
|---|---|
| `BREVO_API_KEY` | Brevo (Sendinblue) transactional email API key |
| `RESEND_API_KEY` | Resend email API key (alternative to Brevo) |
| `EMAIL_FROM` | Sender address for outgoing emails (e.g. `noreply@kishwar.org`) |
| `TWILIO_ACCOUNT_SID` | Twilio SID for WhatsApp notifications |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | Sender WhatsApp number (e.g. `whatsapp:+14155238886`) |
| `WHATSAPP_API_TOKEN` | Meta WhatsApp Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Phone Number ID |

> **Security Note**: Never commit `.env` files or expose `SUPABASE_SERVICE_ROLE_KEY` / provider API keys in client-side bundles or `NEXT_PUBLIC_*` variables.

---

## 3. Database Backup & Disaster Recovery

### Automated Backups
- Supabase automatically maintains Point-in-Time Recovery (PITR) and daily automated snapshots for managed PostgreSQL databases.
- Operators must verify backup retention settings in the Supabase Dashboard (`Database > Backups`).

### Manual Backup Execution
To create a manual logical backup before major maintenance or event launches:
```bash
pg_dump --clean --if-exists --no-owner --no-privileges -d "$DIRECT_URL" -f "kishwar_backup_$(date +%Y%m%d_%H%M%S).sql"
```

### Staging Disaster Recovery Drill
1. Provision a separate staging database instance.
2. Restore the SQL snapshot into staging:
   ```bash
   psql -d "$STAGING_DATABASE_URL" -f "kishwar_backup.sql"
   ```
3. Run post-recovery verification queries:
   - Check total active event registrations: `SELECT count(*) FROM "Registration";`
   - Check invoice balances: `SELECT count(*), sum("totalAmount") FROM "CollectiveInvoice";`
   - Verify foreign key integrity between `CollectiveInvoiceItem` and `Registration`.

---

## 4. Migration Deployment & Rollback Procedures

### Reviewing and Applying Migrations
- All database modifications are defined as additive Prisma migrations inside `prisma/migrations/`.
- Deploy schema changes to production using direct connection:
  ```bash
  npx prisma migrate deploy
  ```
- **Never** run `prisma db push --force-reset` or `prisma migrate reset` in production environments.

### Zero-Downtime Rollback Strategy
If a Next.js application deployment needs to be reverted:
1. Revert the Next.js deployment artifact on Vercel to the previous build ID.
2. Do **NOT** destructively drop columns or tables from the database. All migrations in Kishwar are additive (adding nullable columns or new tables), ensuring backward compatibility with previous application builds.

---

## 5. Notification Provider Troubleshooting & Disabling

- If an external provider (Brevo, Resend, Twilio, Meta) experiences outages:
  - You can safely unset `BREVO_API_KEY` or `TWILIO_AUTH_TOKEN` in the host dashboard.
  - The notification system (`dispatchNotification`) detects missing keys and transitions delivery attempts to `SKIPPED` without interrupting core user registration or payment confirmation workflows.
- View dispatch delivery logs and idempotency keys in `NotificationLog` table:
  ```sql
  SELECT * FROM "NotificationLog" ORDER BY "createdAt" DESC LIMIT 50;
  ```

---

## 6. Credential Rotation Protocol

If credentials (e.g. `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL` password) are compromised:
1. Rotate the database password / API key in Supabase Settings.
2. Update environment variables in Vercel.
3. Trigger a fresh deployment (`git commit --allow-empty` or redeploy in Vercel dashboard).
4. Verify `/api/health` returns `200 OK` with `"status": "ok", "database": "healthy"`.
