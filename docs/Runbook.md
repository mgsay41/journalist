# Operations Runbook - Arabic Journalist CMS

**Project**: Arabic-first Content Management System
**Version**: 1.0.0
**Last Updated**: February 2026
**Environment**: Production (Vercel)

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Deployment Procedures](#deployment-procedures)
3. [Incident Response](#incident-response)
4. [Database Operations](#database-operations)
5. [Monitoring & Logging](#monitoring--logging)
6. [Maintenance Tasks](#maintenance-tasks)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Emergency Contacts](#emergency-contacts)

---

## Quick Reference

### Critical URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Production | `https://your-domain.com` | Live application |
| Admin Dashboard | `https://your-domain.com/admin/dashboard` | Admin panel |
| Vercel Dashboard | `https://vercel.com/dashboard` | Deployment management |
| Sentry | `https://sentry.io` | Error tracking |
| Neon DB | `https://console.neon.tech` | Database management |

### Essential Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:push         # Push schema changes to database
npm run db:migrate      # Create and apply migration
npm run db:studio       # Open Prisma Studio

# Testing
npm test                # Run tests
npm run test:coverage   # Run tests with coverage

# Prisma
npx prisma generate     # Generate Prisma Client
npx prisma validate     # Validate schema
npx prisma format       # Format schema
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon) |
| `BETTER_AUTH_SECRET` | Yes | Secret for Better Auth |
| `BETTER_AUTH_URL` | Yes | Base URL for auth callbacks |
| `GOOGLE_AI_API_KEY` | Yes | Gemini AI API key |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `CRON_SECRET` | Yes | Secret for cron job authentication |
| `SENTRY_DSN` | Optional | Sentry DSN for error tracking |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Sentry DSN for client errors |

---

## Deployment Procedures

### Deploying to Production

**Standard Deployment (via Git)**

1. **Prepare for deployment:**
   ```bash
   # Ensure you're on master/main branch
   git checkout master

   # Pull latest changes
   git pull origin master

   # Run tests
   npm test

   # Build locally to verify
   npm run build
   ```

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   git push origin master
   ```

3. **Verify deployment:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Check deployment status
   - Wait for "Ready" status
   - Test critical functionality

4. **Post-deployment checklist:**
   - [ ] Homepage loads correctly
   - [ ] Admin dashboard accessible
   - [ ] Authentication works
   - [ ] Can create/edit articles
   - [ ] AI features functional
   - [ ] Check Sentry for new errors

**Deployment via Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod
```

### Rolling Back

**Using Vercel Dashboard:**

1. Go to project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Deployments**
3. Find the previous stable deployment
4. Click **Promote to Production**
5. Wait for rollback to complete

**Using Vercel CLI:**

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Blue-Green Deployment

Vercel provides instant rollouts and rollbacks:

1. **Deploy new version:**
   - Push to master branch
   - Vercel automatically creates new deployment
   - New deployment gets its own URL

2. **Verify:**
   - Test on deployment-specific URL
   - Run smoke tests

3. **Promote:**
   - If tests pass, Vercel automatically promotes to production
   - If issues found, rollback immediately

### Database Migration

**Before migrating:**

1. **Backup database:**
   ```bash
   # Via Neon Console:
   # 1. Go to https://console.neon.tech
   # 2. Select your project
   # 3. Click "Backup" or "Export"
   ```

2. **Test migration locally:**
   ```bash
   # Create test migration
   npx prisma migrate dev --name test_migration

   # Apply to test database first
   DATABASE_URL="test-db-url" npx prisma migrate deploy
   ```

**Deploying migration:**

1. **Generate migration:**
   ```bash
   npx prisma migrate dev --name descriptive_name
   ```

2. **Review migration SQL:**
   - Check `prisma/migrations/` folder
   - Verify SQL is safe

3. **Apply to production:**
   ```bash
   npx prisma migrate deploy
   ```

4. **Verify:**
   - Check application functionality
   - Verify data integrity
   - Monitor for errors in Sentry

### Emergency Rollback

**If deployment causes critical issues:**

1. **Immediate rollback:**
   ```bash
   # Via Vercel Dashboard (fastest)
   # Or CLI:
   vercel rollback
   ```

2. **Rollback database if needed:**
   ```bash
   # Restore from backup via Neon Console
   # Or revert migration:
   npx prisma migrate resolve --rolled-back [migration-name]
   ```

3. **Incident response:**
   - Notify team of issue
   - Document incident
   - Create fix in feature branch
   - Test thoroughly
   - Deploy fix when ready

---

## Incident Response

### Incident Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| P0 - Critical | Complete system outage | Immediate | Site down, no access |
| P1 - High | Major functionality broken | 1 hour | Can't publish articles |
| P2 - Medium | Partial functionality impacted | 4 hours | AI features slow |
| P3 - Low | Minor issues | 1 day | Typos in UI |

### Incident Response Process

**1. Detection & Assessment (Minutes 0-15)**

- Detect incident via:
  - Sentry alerts
  - User reports
  - Monitoring dashboards
  - CI/CD failures

- Initial assessment:
  ```bash
  # Check deployment status
  vercel ls

  # Check recent error rate in Sentry

  # Check database status via Neon Console
  ```

- Create incident channel (Slack/Teams)

**2. Triage & Severity Assignment (Minutes 15-30)**

- Assign severity level (P0-P3)
- Assign incident commander
- Notify stakeholders

**3. Investigation & Mitigation (Minutes 30-60 for P0/P1)**

- Gather context:
  - Check Sentry error traces
  - Review recent deployments
  - Check database status
  - Review external API status (Gemini, Cloudinary)

- Implement fix:
  - Rollback if deployment-related
  - Apply hotfix for bugs
  - Scale resources if needed

**4. Resolution & Verification (Minutes 60-120)**

- Verify fix works
- Run smoke tests
- Monitor for recurrence
- Mark incident as resolved

**5. Post-Incident Review (Within 1 week)**

- Document incident timeline
- Identify root cause
- Create action items
- Update runbook if needed

### Common Incident Scenarios

**Scenario: Site Completely Down**

1. Check Vercel status page
2. Check deployment status in Vercel Dashboard
3. If recent deployment, rollback immediately
4. Check domain/DNS configuration
5. Check CDN status
6. Create incident ticket

**Scenario: Database Connection Errors**

1. Check Neon status page
2. Verify DATABASE_URL is correct
3. Check connection pool limits
4. Review slow queries in Neon Console
5. Restart application if needed

**Scenario: AI Features Not Working**

1. Check Gemini API status
2. Verify API key is valid
3. Check rate limits in AiUsage table
4. Review API quota in Google Cloud Console
5. Check for circuit breaker activation

**Scenario: High Error Rate**

1. Check Sentry for error patterns
2. Identify most common errors
3. Check if correlated with recent deployment
4. Review external service status
5. Implement targeted fix

---

## Database Operations

### Backup & Restore

**Creating Manual Backup:**

```bash
# Via Neon Console:
# 1. Go to https://console.neon.tech
# 2. Select your project
# 3. Click "Create Backup"
```

**Restoring from Backup:**

```bash
# Via Neon Console:
# 1. Go to https://console.neon.tech
# 2. Select your project
# 3. Click "Backups" tab
# 4. Select backup to restore
# 5. Click "Restore"
```

### Database Maintenance

**Checking Table Sizes:**

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Finding Slow Queries:**

```sql
-- Enable query logging first in Neon Console
-- Then check logs for slow queries
```

**Vacuum & Analyze:**

```sql
-- Neon handles this automatically
-- Can be run manually if needed:
VACUUM ANALYZE;
```

### Schema Changes

**Adding a Field:**

```bash
# 1. Update schema.prisma
# 2. Generate migration
npx prisma migrate dev --name add_field_name

# 3. Test locally
npm run build

# 4. Deploy to production
git push origin master
```

**Renaming a Field:**

```bash
# 1. Update schema.prisma
# 2. Create migration (may need custom SQL)
npx prisma migrate dev --name rename_field

# 3. Test thoroughly
# 4. Deploy
```

### Data Cleanup

**Automated Cleanup:**

The data cleanup cron job runs automatically (configure in Vercel):

- Deletes expired preview tokens (7+ days old)
- Removes old read notifications (90+ days old)
- Archives old article revisions (1+ year old)
- Cleans up old failed AI usage records (30+ days old)

**Manual Cleanup:**

```bash
# Trigger cleanup manually:
curl -X POST https://your-domain.com/api/cron/data-cleanup \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Monitoring & Logging

### Sentry Error Tracking

**Accessing Sentry:**

1. Go to [https://sentry.io](https://sentry.io)
2. Select project: "journalist-cms"
3. View errors by severity/frequency

**Key Metrics to Monitor:**

- Error rate (errors per request)
- Top error types
- Errors by release
- Performance metrics

**Configuring Alerts:**

1. Go to **Settings > Alerts**
2. Create new alert rule
3. Configure conditions:
   - Error rate > 5%
   - New errors introduced
   - Performance degradation

### Performance Monitoring

**Key Metrics:**

- Response time (p50, p95, p99)
- Database query time
- Cache hit rate
- Error rate

**Viewing Performance Report:**

The application has built-in performance tracking:

```bash
# Access performance metrics (create admin endpoint if needed)
curl https://your-domain.com/api/admin/monitoring/performance \
  -H "Authorization: Bearer $SESSION_TOKEN"
```

### Log Analysis

**Logs are structured JSON:**

```json
{
  "timestamp": "2026-02-06T10:30:00.000Z",
  "level": "error",
  "message": "Database connection failed",
  "context": {
    "operation": "query",
    "table": "Article"
  },
  "requestId": "req_1234567890_abc123",
  "userId": "user_123"
}
```

**Filtering Logs:**

```bash
# In production, logs go to platform-specific tools
# Vercel: vercel logs
# Or integrate with Datadog, LogDNA, etc.
```

---

## Maintenance Tasks

### Daily Tasks

- [ ] Check Sentry for new critical errors
- [ ] Review error rate trends
- [ ] Verify cron jobs completed
- [ ] Check AI usage within quota

### Weekly Tasks

- [ ] Review performance metrics
- [ ] Check database size growth
- [ ] Verify backup completion
- [ ] Review security scan results

### Monthly Tasks

- [ ] Update dependencies (`npm update`)
- [ ] Run security audit (`npm audit`)
- [ ] Review and optimize slow queries
- [ ] Check storage usage (Cloudinary)
- [ ] Review API quotas and limits

### Quarterly Tasks

- [ ] Full disaster recovery test
- [ ] Security audit review
- [ ] Performance optimization review
- [ ] Cost analysis and optimization

---

## Common Issues & Solutions

### Build Failures

**Issue**: TypeScript compilation errors

```bash
# Solution: Check TypeScript errors
npx tsc --noEmit

# Fix type errors in source files
# Rebuild
npm run build
```

**Issue**: Prisma client not generated

```bash
# Solution: Generate Prisma client
npx prisma generate

# Rebuild
npm run build
```

### Runtime Errors

**Issue**: Database connection timeout

```bash
# Solution: Check DATABASE_URL
# Verify Neon database is online
# Check connection pool settings
```

**Issue**: AI rate limit exceeded

```bash
# Solution: Check AiUsage table for usage
# Verify Gemini API quota
# Implement caching if not already
```

### Deployment Issues

**Issue**: Deployment stuck in "Queued"

```bash
# Solution: Check Vercel status
# Cancel deployment and retry
# Contact Vercel support if persists
```

**Issue**: Environment variables not set

```bash
# Solution: Check Vercel environment variables
# Ensure all required variables are set
# Redeploy after adding variables
```

---

## Emergency Contacts

| Role | Name | Contact | Availability |
|------|------|---------|---------------|
| DevOps Lead | | | |
| Backend Lead | | | |
| Database Admin | | | |
| Security Lead | | | |

### External Support

| Service | Support Link |
|---------|--------------|
| Vercel | https://vercel.com/support |
| Neon DB | https://neon.tech/support |
| Sentry | https://sentry.io/support/ |
| Google Cloud | https://cloud.google.com/support |

---

## Appendix

### Useful Queries

**Articles by status:**
```sql
SELECT status, COUNT(*) as count
FROM "Article"
GROUP BY status;
```

**Recent failed AI requests:**
```sql
SELECT * FROM "AiUsage"
WHERE success = false
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Users with most articles:**
```sql
SELECT u.name, COUNT(a.id) as article_count
FROM "User" u
LEFT JOIN "Article" a ON u.id = a."authorId"
GROUP BY u.id, u.name
ORDER BY article_count DESC;
```

### Cron Job Configuration

**Vercel Cron Jobs:**

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/publish-scheduled",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/data-cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

**Document Version**: 1.0
**Last Reviewed**: February 2026
**Next Review**: May 2026
