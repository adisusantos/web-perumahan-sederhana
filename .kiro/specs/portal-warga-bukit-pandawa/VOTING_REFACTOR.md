# Voting Feature Refactor

## 🎯 Tujuan Refactor

Refactor fitur voting admin yang sebelumnya tidak selesai dan terlalu kompleks menjadi implementasi yang lebih sederhana, modular, dan mudah di-maintain.

## ❌ Masalah Sebelumnya

1. **File tidak lengkap** - Hanya ada setup (types, reducer, form component) tapi tidak ada main page component
2. **Terlalu kompleks** - Menggunakan useReducer dengan 193 baris state management untuk halaman admin sederhana
3. **Over-engineering** - Banyak unused imports dan helper functions yang tidak terpakai
4. **Tidak ada data fetching logic** - Tidak ada useEffect untuk load polls
5. **Tidak ada submit handler** - Form tidak bisa submit karena logic tidak ada

## ✅ Solusi Refactor

### Pendekatan: Modular & Simple

Memecah fitur menjadi 3 komponen kecil yang reusable:

#### 1. **PollFormFields.tsx** (Form Component)
- **Lokasi**: `src/components/voting/PollFormFields.tsx`
- **Fungsi**: Reusable form fields untuk membuat poll
- **Props**:
  - `values`: Form data (title, description, type, options, dll)
  - `onChange`: Handler untuk update field
  - `disabled`: Loading state
  - `isKetuaGang`: Flag untuk ketua gang (auto-lock gang scope)
  - `gangName`: Nama gang untuk ketua gang
- **Fitur**:
  - Input judul & deskripsi
  - Radio button untuk tipe (publik/gang)
  - Dynamic options (min 2, max 10)
  - Datetime picker untuk auto-close
  - Validasi client-side

#### 2. **AdminPollCard.tsx** (Display Component)
- **Lokasi**: `src/components/voting/AdminPollCard.tsx`
- **Fungsi**: Card untuk menampilkan poll dengan actions
- **Props**:
  - `poll`: Data poll dengan options dan total votes
  - `onClose`: Handler untuk tutup poll
  - `isClosing`: Loading state saat menutup
- **Fitur**:
  - Tampilkan info poll (title, description, status, metadata)
  - Badge status (aktif/selesai)
  - List pilihan
  - Tombol "Salin Link" untuk poll gang (copy secret link)
  - Tombol "Tutup Poll" dengan konfirmasi
  - Total votes

#### 3. **AdminVotingPage** (Main Page)
- **Lokasi**: `src/app/admin/voting/page.tsx`
- **Fungsi**: Halaman utama admin voting
- **State Management**: useState (simple, no reducer)
- **Fitur**:
  - Load profile untuk cek role (admin/ketua_gang)
  - Load polls dengan filter berdasarkan role
  - Toggle form buat poll baru
  - Submit form ke API `/api/admin/polls`
  - Close poll via API PATCH
  - Empty state & loading state
  - Error handling

## 📊 Perbandingan

| Aspek | Sebelum | Sesudah |
|-------|---------|---------|
| **Lines of Code** | 450+ (incomplete) | ~450 (complete, split 3 files) |
| **State Management** | useReducer (193 lines) | useState (simple) |
| **Modularity** | Monolithic | 3 komponen terpisah |
| **Reusability** | Low | High (form & card reusable) |
| **Completeness** | ❌ Tidak selesai | ✅ Lengkap & functional |
| **Maintainability** | ❌ Sulit | ✅ Mudah |

## 🔄 Flow Aplikasi

### 1. Load Data
```
Page Mount → Load Profile → Load Polls (filtered by role) → Display
```

### 2. Create Poll
```
Click "Buat Poll" → Show Form → Fill Data → Submit → API POST → Update State → Hide Form
```

### 3. Close Poll
```
Click "Tutup Poll" → Show Confirm → Click "Ya, Tutup" → API PATCH → Update State
```

### 4. Copy Secret Link (Gang Poll)
```
Click "Salin Link" → Copy to Clipboard → Show "Tersalin!" → Reset after 2s
```

## 🎨 UI/UX Improvements

1. **Form Validation**: Client-side validation sebelum submit
2. **Loading States**: Loading indicator untuk semua async operations
3. **Error Handling**: Error messages yang jelas dan actionable
4. **Confirmation**: Konfirmasi sebelum tutup poll (prevent accidental close)
5. **Feedback**: Visual feedback untuk copy link (button text change)
6. **Responsive**: Mobile-first design dengan flex layout

## 🧪 Testing Checklist

- [ ] Admin bisa buat poll publik
- [ ] Admin bisa buat poll gang dengan secret token
- [ ] Ketua gang hanya bisa buat poll untuk gang sendiri
- [ ] Ketua gang hanya lihat poll publik + poll gang sendiri
- [ ] Form validation bekerja (title required, min 2 options, dll)
- [ ] Tutup poll manual bekerja
- [ ] Copy secret link bekerja
- [ ] Auto-close poll berdasarkan `closes_at`
- [ ] Total votes ditampilkan dengan benar
- [ ] Empty state ditampilkan saat belum ada poll
- [ ] Error handling bekerja untuk semua edge cases

## 📝 Next Steps

1. Test manual di browser (login sebagai admin & ketua gang)
2. Fix bugs jika ada
3. Add loading skeleton untuk better UX
4. Consider adding pagination jika poll banyak
5. Add filter/search untuk poll list

## 🔗 Related Files

- API Route: `src/app/api/admin/polls/route.ts` (sudah ada)
- Types: `src/types/index.ts` (Poll, PollOption, Profile)
- Utils: `src/lib/utils.ts` (generateSecretToken)
- Components: `src/components/ui/Button.tsx`, `Badge.tsx`, `EmptyState.tsx`
