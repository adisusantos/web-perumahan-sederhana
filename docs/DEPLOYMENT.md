# Deployment Guide - Portal Warga Bukit Pandawa

## Pre-Deployment Checklist

### 1. Code Review
- [ ] Semua fitur sudah ditest secara manual
- [ ] Tidak ada console.log atau debug code
- [ ] Error handling sudah proper
- [ ] Loading states sudah ada di semua async operations
- [ ] Validation sudah ada di client dan server side

### 2. Environment Variables
- [ ] Semua env vars sudah di-set di production
- [ ] Tidak ada hardcoded secrets di code
- [ ] `.env.local.example` sudah up-to-date

### 3. Database
- [ ] Backup database production (jika ada data existing)
- [ ] Migration files sudah ready
- [ ] RLS policies sudah di-test
- [ ] Indexes sudah optimal

### 4. Security
- [ ] RLS enabled di semua tabel
- [ ] API routes sudah protected dengan authentication
- [ ] Input validation sudah ada
- [ ] CORS settings sudah benar

### 5. Performance
- [ ] Images sudah optimized
- [ ] Pagination sudah implemented
- [ ] Debouncing sudah ada untuk search
- [ ] Loading skeletons sudah ada

---

## Deployment Steps (Vercel)

### Step 1: Prepare Repository

1. **Commit semua changes:**
```bash
git add .
git commit -m "feat: add dashboard data warga feature"
git push origin main
```

2. **Tag release (optional):**
```bash
git tag -a v1.0.0 -m "Release v1.0.0 - Dashboard Data Warga"
git push origin v1.0.0
```

### Step 2: Setup Vercel Project

1. **Login ke Vercel:**
   - Go to https://vercel.com
   - Login dengan GitHub account

2. **Import Project:**
   - Click "Add New" → "Project"
   - Select repository: `web-perumahan-sederhana`
   - Click "Import"

3. **Configure Project:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

### Step 3: Set Environment Variables

Di Vercel Dashboard → Settings → Environment Variables, tambahkan:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Google Sheets (untuk fitur keuangan)
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1xxx...
```

**Important Notes:**
- Set untuk environment: **Production**, **Preview**, dan **Development**
- `GOOGLE_PRIVATE_KEY` harus dalam format string dengan `\n` untuk newlines
- Pastikan tidak ada trailing spaces

### Step 4: Deploy

1. **Click "Deploy"**
   - Vercel akan otomatis build dan deploy
   - Monitor build logs untuk errors

2. **Wait for deployment:**
   - Build time: ~2-3 menit
   - Deployment akan otomatis live setelah build success

3. **Get deployment URL:**
   - Production: `https://your-project.vercel.app`
   - Custom domain bisa di-setup nanti

### Step 5: Setup Database Migration

1. **Login ke Supabase Dashboard:**
   - Go to https://app.supabase.com
   - Select project

2. **Run Migration:**
   - Go to SQL Editor
   - Open `supabase/migrations/003_resident_database.sql`
   - Copy-paste content
   - Click "Run"

3. **Verify Migration:**
```sql
-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('houses', 'residents', 'pbb_payments', 'audit_logs');

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('houses', 'residents', 'pbb_payments', 'audit_logs');

-- Check policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('houses', 'residents', 'pbb_payments', 'audit_logs');
```

### Step 6: Verify Deployment

1. **Test Authentication:**
   - Login dengan admin account
   - Check role di tabel `profiles`

2. **Test Data Warga Features:**
   - [ ] View data warga list
   - [ ] Add new house
   - [ ] Edit house
   - [ ] Add resident
   - [ ] Edit resident
   - [ ] Add PBB payment
   - [ ] View statistics
   - [ ] Export CSV
   - [ ] Delete house (test cascade delete)

3. **Test Access Control:**
   - [ ] Login sebagai admin → full access
   - [ ] Login sebagai ketua_gang → read-only, no sensitive data
   - [ ] Logout → redirect ke login

4. **Test Performance:**
   - [ ] Page load time < 3 detik
   - [ ] Search response time < 2 detik
   - [ ] No console errors

### Step 7: Setup Custom Domain (Optional)

1. **Add Domain di Vercel:**
   - Go to Settings → Domains
   - Add your domain (e.g., `warga.bukitpandawa.com`)

2. **Configure DNS:**
   - Add CNAME record di DNS provider:
     - Name: `warga` (atau `@` untuk root domain)
     - Value: `cname.vercel-dns.com`

3. **Wait for DNS propagation:**
   - Biasanya 5-10 menit
   - Vercel akan otomatis setup SSL certificate

---

## Post-Deployment

### 1. Monitoring

**Setup Vercel Analytics:**
- Go to Analytics tab di Vercel Dashboard
- Enable Web Analytics
- Monitor page views, performance, errors

**Setup Supabase Monitoring:**
- Go to Reports di Supabase Dashboard
- Monitor database performance
- Check API usage

### 2. Backup Strategy

**Automated Backups (Supabase):**
- Go to Settings → Database → Backups
- Enable daily backups
- Retention: 7 days (free tier) atau 30 days (pro tier)

**Manual Backup:**
```bash
# Via Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d).sql

# Schedule via cron (optional)
0 2 * * * cd /path/to/project && supabase db dump -f backup-$(date +%Y%m%d).sql
```

### 3. Error Tracking (Optional)

**Setup Sentry:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Configure Sentry:**
```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### 4. Performance Monitoring

**Vercel Speed Insights:**
```bash
npm install @vercel/speed-insights
```

```javascript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## Rollback Plan

### If Deployment Fails:

1. **Check Build Logs:**
   - Go to Deployments tab di Vercel
   - Click failed deployment
   - Check error logs

2. **Common Issues:**
   - **Build Error:** Check TypeScript errors, missing dependencies
   - **Runtime Error:** Check environment variables
   - **Database Error:** Check migration, RLS policies

3. **Rollback to Previous Version:**
   - Go to Deployments tab
   - Find last successful deployment
   - Click "..." → "Promote to Production"

### If Database Migration Fails:

1. **Restore from Backup:**
```sql
-- Via Supabase Dashboard
-- Settings → Database → Backups → Restore
```

2. **Revert Migration:**
```sql
-- Drop tables (CAREFUL!)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS pbb_payments CASCADE;
DROP TABLE IF EXISTS residents CASCADE;
DROP TABLE IF EXISTS houses CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS audit_log_changes() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

---

## Troubleshooting

### Issue: Build Failed

**Error: TypeScript errors**
```bash
# Fix locally first
npm run build

# Check errors
npm run type-check
```

**Error: Missing dependencies**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: Environment Variables Not Working

1. **Check Vercel Dashboard:**
   - Settings → Environment Variables
   - Pastikan semua vars ada
   - Pastikan tidak ada typo

2. **Redeploy:**
   - Deployments → Latest → "Redeploy"
   - Environment variables hanya apply setelah redeploy

### Issue: Database Connection Failed

1. **Check Supabase Status:**
   - https://status.supabase.com

2. **Check Connection String:**
   - Supabase Dashboard → Settings → Database
   - Verify `NEXT_PUBLIC_SUPABASE_URL` benar

3. **Check RLS Policies:**
```sql
-- Disable RLS temporarily untuk debug (JANGAN DI PRODUCTION!)
ALTER TABLE houses DISABLE ROW LEVEL SECURITY;

-- Re-enable setelah debug
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
```

### Issue: Slow Performance

1. **Check Database Indexes:**
```sql
-- List indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('houses', 'residents', 'pbb_payments');
```

2. **Analyze Slow Queries:**
```sql
-- Enable query logging di Supabase
-- Settings → Database → Query Performance
```

3. **Optimize Images:**
```bash
# Use Next.js Image component
import Image from 'next/image';

<Image
  src="/image.jpg"
  width={500}
  height={300}
  alt="Description"
/>
```

---

## Maintenance

### Regular Tasks

**Weekly:**
- [ ] Check error logs di Vercel
- [ ] Check database performance di Supabase
- [ ] Review audit logs untuk suspicious activity

**Monthly:**
- [ ] Review and optimize slow queries
- [ ] Check disk usage di Supabase
- [ ] Update dependencies (`npm outdated`)

**Quarterly:**
- [ ] Security audit
- [ ] Performance review
- [ ] Backup verification (test restore)

### Updating Dependencies

```bash
# Check outdated packages
npm outdated

# Update non-breaking changes
npm update

# Update major versions (CAREFUL!)
npm install package@latest

# Test after update
npm run build
npm run dev
```

---

## Security Checklist

- [ ] RLS enabled di semua tabel
- [ ] Environment variables tidak di-commit ke git
- [ ] API routes protected dengan authentication
- [ ] Input validation di client dan server
- [ ] HTTPS enabled (otomatis di Vercel)
- [ ] CORS configured properly
- [ ] Rate limiting (optional, untuk production)
- [ ] Audit logging enabled
- [ ] Regular backups
- [ ] Security headers configured

### Security Headers (Optional)

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

---

## Support & Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Supabase Docs:** https://supabase.com/docs
- **Tailwind CSS Docs:** https://tailwindcss.com/docs

## Contact

Untuk issue atau pertanyaan deployment, hubungi:
- Email: [your-email]
- GitHub Issues: [repository-url]/issues
