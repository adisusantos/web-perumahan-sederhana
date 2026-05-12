# Deployment Checklist - Dashboard Data Warga

## Pre-Deployment

### Code Quality
- [ ] Semua tasks 1-27 sudah completed
- [ ] Tidak ada TypeScript errors (`npm run build`)
- [ ] Tidak ada console.log atau debug code
- [ ] Error messages sudah dalam Bahasa Indonesia
- [ ] Loading states ada di semua async operations

### Testing
- [ ] Manual testing Task 25 completed
- [ ] CRUD operations berfungsi (create, read, update, delete)
- [ ] Filter dan search berfungsi
- [ ] Pagination berfungsi
- [ ] Export CSV berfungsi
- [ ] Access control berfungsi (admin vs ketua_gang)
- [ ] Data sensitif ter-filter untuk ketua_gang
- [ ] Responsive design di mobile, tablet, desktop

### Database
- [ ] Backup database production (jika ada data existing)
- [ ] Migration file `003_resident_database.sql` ready
- [ ] RLS policies sudah di-test
- [ ] Triggers berfungsi (audit logging, updated_at)
- [ ] Indexes sudah optimal

### Environment Variables
- [ ] `.env.local.example` sudah up-to-date
- [ ] Semua required env vars documented
- [ ] Tidak ada hardcoded secrets di code

### Security
- [ ] RLS enabled di semua tabel (houses, residents, pbb_payments, audit_logs)
- [ ] API routes protected dengan authentication
- [ ] Input validation di client dan server side
- [ ] Audit logging berfungsi

### Performance
- [ ] Page load time < 3 detik
- [ ] Search response time < 2 detik
- [ ] Debouncing implemented (500ms)
- [ ] Pagination implemented
- [ ] Loading skeletons implemented

---

## Deployment Steps

### 1. Repository
- [ ] Commit semua changes
- [ ] Push ke GitHub
- [ ] Tag release (optional): `git tag -a v1.0.0 -m "Release v1.0.0"`

### 2. Vercel Setup
- [ ] Import project ke Vercel
- [ ] Configure build settings (default Next.js)
- [ ] Set environment variables:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - [ ] `GOOGLE_PRIVATE_KEY`
  - [ ] `GOOGLE_SHEET_ID`

### 3. Database Migration
- [ ] Login ke Supabase Dashboard
- [ ] Backup database (Settings → Database → Backups)
- [ ] Run migration `003_resident_database.sql` di SQL Editor
- [ ] Verify tables created:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('houses', 'residents', 'pbb_payments', 'audit_logs');
  ```
- [ ] Verify RLS enabled:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('houses', 'residents', 'pbb_payments', 'audit_logs');
  ```
- [ ] Verify policies exist:
  ```sql
  SELECT tablename, policyname FROM pg_policies 
  WHERE tablename IN ('houses', 'residents', 'pbb_payments', 'audit_logs');
  ```

### 4. Deploy
- [ ] Click "Deploy" di Vercel
- [ ] Monitor build logs
- [ ] Wait for deployment success
- [ ] Get production URL

---

## Post-Deployment Verification

### Authentication & Authorization
- [ ] Login dengan admin account berfungsi
- [ ] Login dengan ketua_gang account berfungsi
- [ ] Logout berfungsi
- [ ] Protected routes redirect ke login jika belum auth

### Data Warga Features (Admin)
- [ ] View data warga list
- [ ] Filter by gang berfungsi
- [ ] Filter by PBB status berfungsi
- [ ] Search by name berfungsi
- [ ] Pagination berfungsi
- [ ] Statistics cards menampilkan data benar
- [ ] Add house berfungsi (dengan custom gang)
- [ ] Edit house berfungsi
- [ ] Delete house berfungsi (cascade delete)
- [ ] Add resident berfungsi
- [ ] Edit resident berfungsi (jika sudah di-wire)
- [ ] Delete resident berfungsi
- [ ] Add PBB payment berfungsi
- [ ] View PBB history berfungsi
- [ ] Edit PBB status berfungsi
- [ ] Export CSV berfungsi

### Data Warga Features (Ketua Gang)
- [ ] View data warga list (read-only)
- [ ] Filter dan search berfungsi
- [ ] Statistics visible
- [ ] Data sensitif (phone, email) tidak muncul
- [ ] Button "Tambah Rumah" tidak muncul
- [ ] Button "Export CSV" tidak muncul
- [ ] Action menu hanya show "Kelola PBB"
- [ ] CRUD operations tidak bisa dilakukan

### Error Handling
- [ ] Toast notifications muncul untuk success/error
- [ ] Confirmation dialog muncul sebelum delete
- [ ] Error messages dalam Bahasa Indonesia
- [ ] Network errors handled gracefully
- [ ] Validation errors shown clearly

### Performance
- [ ] Page load time < 3 detik
- [ ] Search response time < 2 detik
- [ ] No console errors
- [ ] No memory leaks
- [ ] Images loaded properly

### Responsive Design
- [ ] Desktop (1920x1080) - layout proper
- [ ] Laptop (1366x768) - layout proper
- [ ] Tablet (768x1024) - layout proper
- [ ] Mobile (375x667) - layout proper, table scrollable

### Accessibility
- [ ] Keyboard navigation berfungsi (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] ARIA labels ada
- [ ] Color contrast memenuhi WCAG 2.1 Level AA

---

## Monitoring Setup

### Vercel
- [ ] Enable Web Analytics
- [ ] Monitor page views
- [ ] Monitor performance metrics
- [ ] Check error logs

### Supabase
- [ ] Monitor database performance (Reports)
- [ ] Monitor API usage
- [ ] Setup alerts untuk high usage
- [ ] Enable daily backups

### Optional
- [ ] Setup Sentry untuk error tracking
- [ ] Setup Vercel Speed Insights
- [ ] Setup uptime monitoring (e.g., UptimeRobot)

---

## Rollback Plan

### If Deployment Fails
1. [ ] Check build logs di Vercel
2. [ ] Fix errors locally
3. [ ] Redeploy
4. [ ] If critical: Rollback to previous deployment

### If Database Migration Fails
1. [ ] Restore from backup
2. [ ] Review migration script
3. [ ] Fix issues
4. [ ] Re-run migration

### Rollback Commands
```sql
-- Drop tables (CAREFUL! Only if needed)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS pbb_payments CASCADE;
DROP TABLE IF EXISTS residents CASCADE;
DROP TABLE IF EXISTS houses CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS audit_log_changes() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

---

## Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Fix critical bugs if any

### Week 1
- [ ] Monitor performance metrics
- [ ] Check database usage
- [ ] Review audit logs
- [ ] Collect user feedback

### Month 1
- [ ] Performance review
- [ ] Security audit
- [ ] Optimize slow queries
- [ ] Plan improvements

---

## Known Issues & Limitations

### Current Limitations
- [ ] Edit resident button belum di-wire ke UI (EditResidentModal sudah ada tapi belum accessible)
- [ ] Toast notifications belum integrated ke DataWargaClient
- [ ] ConfirmDialog belum integrated untuk delete operations
- [ ] No rate limiting (consider untuk production)
- [ ] No full-text search (using ILIKE untuk search)

### Future Enhancements
- [ ] Add edit button untuk individual residents
- [ ] Integrate Toast dan ConfirmDialog
- [ ] Add rate limiting
- [ ] Add full-text search
- [ ] Add bulk operations (bulk delete, bulk export)
- [ ] Add data import from CSV
- [ ] Add email notifications
- [ ] Add WhatsApp integration untuk broadcast

---

## Success Criteria

Deployment dianggap sukses jika:
- ✅ Semua checklist items completed
- ✅ No critical bugs
- ✅ Performance metrics met (load time < 3s, search < 2s)
- ✅ Access control berfungsi properly
- ✅ Data integrity maintained
- ✅ User feedback positive

---

## Sign-off

**Deployed by:** _________________  
**Date:** _________________  
**Version:** v1.0.0  
**Production URL:** _________________  

**Verified by:**
- [ ] Developer: _________________
- [ ] Admin User: _________________
- [ ] Ketua Gang User: _________________

**Notes:**
_________________
_________________
_________________
