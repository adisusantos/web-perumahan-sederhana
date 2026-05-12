# API Documentation - Portal Warga Bukit Pandawa

## Base URL
```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication
Semua endpoint `/api/admin/*` memerlukan authentication via Supabase Auth.

Headers yang diperlukan:
```
Authorization: Bearer <supabase_access_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message in Indonesian"
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `unauthorized` | 403 | User belum login atau session expired |
| `forbidden` | 403 | User tidak memiliki akses untuk operasi ini |
| `validation_error` | 400 | Input validation gagal |
| `not_found` | 404 | Resource tidak ditemukan |
| `conflict` | 409 | Data sudah ada (duplicate) |
| `server_error` | 500 | Internal server error |

---

## Data Warga Endpoints

### 1. List Data Warga

**Endpoint:** `GET /api/admin/residents`

**Access:** Admin & Ketua Gang

**Description:** Mengambil list data warga dengan filter, search, dan pagination.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `gang` | string | No | - | Filter berdasarkan gang (contoh: "A", "B") |
| `pbb_status` | string | No | - | Filter berdasarkan status PBB ("lunas" atau "belum") |
| `search` | string | No | - | Search berdasarkan nama pemilik atau penghuni |
| `page` | number | No | 1 | Nomor halaman |
| `limit` | number | No | 50 | Jumlah item per halaman (max: 100) |

**Example Request:**
```bash
GET /api/admin/residents?gang=A&pbb_status=lunas&page=1&limit=20
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "houses": [
      {
        "id": "uuid",
        "address": "A-12",
        "gang": "A",
        "owner_name": "John Doe",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "residents": [
          {
            "id": "uuid",
            "house_id": "uuid",
            "name": "Jane Doe",
            "phone": "081234567890",  // Only for admin
            "email": "jane@example.com",  // Only for admin
            "is_primary": true,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
          }
        ],
        "latest_pbb": {
          "tax_year": 2024,
          "status": "lunas"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

**Notes:**
- Data sensitif (phone, email) hanya muncul untuk admin
- Ketua gang hanya melihat data publik

---

### 2. Create Rumah Baru

**Endpoint:** `POST /api/admin/residents`

**Access:** Admin only

**Description:** Menambah rumah baru beserta penghuni (optional).

**Request Body:**
```json
{
  "address": "A-12",
  "gang": "A",
  "owner_name": "John Doe",
  "residents": [
    {
      "name": "Jane Doe",
      "phone": "081234567890",
      "email": "jane@example.com",
      "is_primary": true
    }
  ]
}
```

**Field Validation:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `address` | string | Yes | Non-empty, unique per gang |
| `gang` | string | Yes | Non-empty |
| `owner_name` | string | Yes | Non-empty |
| `residents` | array | No | Array of resident objects |
| `residents[].name` | string | Yes | Non-empty |
| `residents[].phone` | string | No | Format Indonesia (08xxx) |
| `residents[].email` | string | No | Valid email format |
| `residents[].is_primary` | boolean | No | Default: false |

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "house_id": "uuid",
    "message": "Data rumah berhasil ditambahkan."
  }
}
```

**Error Responses:**

- **400 Validation Error:**
```json
{
  "success": false,
  "error": "validation_error",
  "message": "Field 'address' tidak boleh kosong."
}
```

- **409 Conflict:**
```json
{
  "success": false,
  "error": "conflict",
  "message": "Alamat A-12 di Gang A sudah terdaftar."
}
```

---

### 3. Update Data

**Endpoint:** `PATCH /api/admin/residents`

**Access:** Admin only

**Description:** Update data rumah, penghuni, atau PBB.

**Request Body:**
```json
{
  "type": "house" | "resident" | "pbb",
  "id": "uuid",
  "data": {
    // Fields to update
  }
}
```

#### Update House
```json
{
  "type": "house",
  "id": "house-uuid",
  "data": {
    "address": "A-13",
    "gang": "A",
    "owner_name": "John Smith"
  }
}
```

#### Update Resident
```json
{
  "type": "resident",
  "id": "resident-uuid",
  "data": {
    "name": "Jane Smith",
    "phone": "081234567890",
    "email": "jane.smith@example.com",
    "is_primary": true
  }
}
```

#### Update PBB
```json
{
  "type": "pbb",
  "id": "pbb-uuid",
  "data": {
    "status": "lunas",
    "notes": "Sudah dibayar"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Data rumah berhasil diupdate."
}
```

---

### 4. Delete Data

**Endpoint:** `DELETE /api/admin/residents`

**Access:** Admin only

**Description:** Hapus rumah atau penghuni.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | "house" atau "resident" |
| `id` | string | Yes | UUID dari record yang akan dihapus |

**Example Request:**
```bash
DELETE /api/admin/residents?type=house&id=uuid
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Data rumah berhasil dihapus."
}
```

**Notes:**
- Menghapus house akan cascade delete semua residents dan pbb_payments
- Menghapus resident hanya menghapus data penghuni tersebut

---

### 5. Get Statistics

**Endpoint:** `GET /api/admin/residents/stats`

**Access:** Admin & Ketua Gang

**Description:** Mengambil statistik data warga.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `gang` | string | No | Filter statistik berdasarkan gang |

**Example Request:**
```bash
GET /api/admin/residents/stats?gang=A
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "total_houses": 100,
    "houses_by_gang": {
      "A": 30,
      "B": 40,
      "C": 30
    },
    "pbb_stats": {
      "total": 100,
      "lunas": 80,
      "belum": 20,
      "percentage_lunas": 80,
      "by_year": {
        "2024": {
          "total": 100,
          "lunas": 80,
          "belum": 20
        },
        "2023": {
          "total": 100,
          "lunas": 95,
          "belum": 5
        }
      }
    }
  }
}
```

---

### 6. Export Data

**Endpoint:** `GET /api/admin/residents/export`

**Access:** Admin only

**Description:** Export data warga ke format CSV.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `gang` | string | No | Filter export berdasarkan gang |

**Example Request:**
```bash
GET /api/admin/residents/export?gang=A
```

**Success Response (200):**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="data-warga-2024-01-01.csv"`

**CSV Format:**
```csv
Alamat,Gang,Pemilik,Penghuni,Telepon,Email,Status Penghuni,PBB Tahun,PBB Status
A-12,A,John Doe,Jane Doe,081234567890,jane@example.com,Utama,2024,Lunas
```

---

### 7. Add PBB Payment

**Endpoint:** `POST /api/admin/residents/pbb`

**Access:** Admin only

**Description:** Menambah data pembayaran PBB.

**Request Body:**
```json
{
  "house_id": "uuid",
  "tax_year": 2024,
  "status": "lunas" | "belum",
  "notes": "Optional notes"
}
```

**Field Validation:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `house_id` | string | Yes | Valid UUID, house must exist |
| `tax_year` | number | Yes | 2000-2100 |
| `status` | string | Yes | "lunas" atau "belum" |
| `notes` | string | No | - |

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "payment_id": "uuid",
    "message": "Data PBB berhasil ditambahkan."
  }
}
```

**Error Responses:**

- **404 Not Found:**
```json
{
  "success": false,
  "error": "not_found",
  "message": "Data rumah tidak ditemukan."
}
```

- **409 Conflict:**
```json
{
  "success": false,
  "error": "conflict",
  "message": "Data PBB untuk tahun 2024 sudah ada."
}
```

---

### 8. Get PBB History

**Endpoint:** `GET /api/admin/residents/pbb-history`

**Access:** Admin & Ketua Gang

**Description:** Mengambil riwayat pembayaran PBB untuk rumah tertentu.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `house_id` | string | Yes | UUID dari rumah |

**Example Request:**
```bash
GET /api/admin/residents/pbb-history?house_id=uuid
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "house": {
      "id": "uuid",
      "address": "A-12",
      "gang": "A",
      "owner_name": "John Doe"
    },
    "payments": [
      {
        "id": "uuid",
        "house_id": "uuid",
        "tax_year": 2024,
        "status": "lunas",
        "reported_at": "2024-01-15T10:00:00Z",
        "reported_by": "admin-uuid",
        "notes": "Sudah dibayar",
        "created_at": "2024-01-15T10:00:00Z"
      },
      {
        "id": "uuid",
        "house_id": "uuid",
        "tax_year": 2023,
        "status": "lunas",
        "reported_at": "2023-01-20T10:00:00Z",
        "reported_by": "admin-uuid",
        "notes": null,
        "created_at": "2023-01-20T10:00:00Z"
      }
    ]
  }
}
```

---

## Rate Limiting

Saat ini belum ada rate limiting. Untuk production, disarankan menggunakan:
- Vercel Edge Config untuk rate limiting
- Atau middleware custom untuk rate limiting per IP/user

## Caching

- GET endpoints bisa di-cache dengan `Cache-Control` headers
- Revalidate cache setelah POST/PATCH/DELETE operations

## Webhooks

Saat ini belum ada webhook support. Untuk future development, bisa ditambahkan webhook untuk:
- Notifikasi ketika ada data warga baru
- Notifikasi ketika PBB sudah lunas
- Audit log changes

## Changelog

### v1.0.0 (2024-01-01)
- Initial release
- CRUD data warga
- Statistik dan export
- RLS policies untuk kontrol akses
