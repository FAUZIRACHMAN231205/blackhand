# 🎨 ADMIN PANEL SETUP GUIDE - BLACKHAND

## 📋 Apa yang Sudah Dibuat

### 1. **Database Schema** ✅

- `works` table - Album/Karya (title, description, category, featured_image, dll)
- `work_images` table - Images per album (max 6 images, featured flag)
- Row Level Security (RLS) untuk proteksi data
- Admin-only access via email check

### 2. **Admin Pages** ✅

```
/admin                      - Admin Dashboard
/admin/works                - Manage Works (list)
/admin/works/create         - Upload New Work Form
/admin/works/[id]/edit      - Edit Work & Images
```

### 3. **User Gallery** ✅

```
/works                      - Gallery View (published works only)
/works/[id]                 - Work Detail (6 images, thumbnails, featured)
```

### 4. **Admin Protection** ✅

- Hanya email admin yang bisa akses `/admin` pages
- Email admin: `manyungalang@gmail.com`, `fauzirachman10091985@gmail.com`
- Auto redirect jika bukan admin

---

## 🚀 SETUP STEPS

### Step 1: Buat Database Tables

1. Buka Supabase Dashboard → SQL Editor
2. Copy-paste dari [DATABASE_SCHEMA_ADMIN.sql](./DATABASE_SCHEMA_ADMIN.sql)
3. Run queries

**Queries yang dijalankan:**

- `CREATE TABLE works` dengan RLS policies
- `CREATE TABLE work_images` dengan RLS policies
- Create indexes untuk performance

### Step 2: Setup Supabase Storage

Untuk upload images, kita perlu storage bucket:

1. Buka Supabase Dashboard → Storage
2. Buat bucket baru dengan nama: **`work-images`**
3. Set bucket sebagai public:
   - Click bucket → Edit → uncheck "Private" → Save
4. Setup CORS (jika diperlukan):
   - Allowed origins: `http://localhost:3000, https://yourdomain.com`
   - Allowed methods: `GET, POST, PUT`
   - Allowed headers: `*`

### Step 3: Verify Admin Setup

Admin protection sudah di kode:

- File: [`app/lib/adminUtils.ts`](../app/lib/adminUtils.ts)
- Email list:
  ```typescript
  const ADMIN_EMAILS = [
    "manyungalang@gmail.com",
    "fauzirachman10091985@gmail.com",
  ];
  ```

### Step 4: Test di Browser

**Restart dev server:**

```bash
npm run dev
```

**Test Flow:**

#### A. Login as Admin

1. Go to `http://localhost:3000`
2. Login dengan email admin: `manyungalang@gmail.com`
3. Go to `/admin` → Should see Admin Dashboard

#### B. Upload Work

1. Click "Upload New Work"
2. Fill form:
   - Title: "My First Masterpiece"
   - Description: "Beautiful artwork"
   - Category: "Paintings"
   - Upload 1-6 images
3. Click "Create Work" → Success!

#### C. View in Gallery

1. Go to `/works` (login required)
2. Should see the work in gallery
3. Click card to view details with all images
4. Use arrow buttons to navigate images
5. Click thumbnails to jump to specific image

#### D. Edit Work

1. Go to `/admin/works`
2. Click Edit icon
3. Modify details, set featured image, delete images
4. Click "Update Work"

#### E. Test as Non-Admin

1. Logout
2. Login dengan email biasa (bukan admin)
3. Try access `/admin` → Should redirect to `/dashboard`
4. `/works` → Can view gallery ✅

---

## 📊 DATABASE STRUCTURE

### Works Table

```
id (UUID) - Primary Key
title (VARCHAR 255) - Work title
description (TEXT) - Full description
category (VARCHAR) - Paintings/Digital Art/Sculptures
featured_image_url (VARCHAR) - URL gambar featured
is_featured (BOOLEAN) - Apakah work ini featured showcase
is_published (BOOLEAN) - Published/Draft status
created_by (UUID) - User ID (FK to auth.users)
created_at (TIMESTAMP) - Auto timestamp
updated_at (TIMESTAMP) - Auto update
```

### Work Images Table

```
id (UUID) - Primary Key
work_id (UUID) - FK to works
image_url (VARCHAR) - Supabase storage URL
display_order (INT) - 1-6 urutan gambar
is_featured (BOOLEAN) - Featured gambar dalam album
created_at (TIMESTAMP) - Upload timestamp
```

---

## 🔐 SECURITY FEATURES

### RLS Policies

- **Public users:** Hanya bisa lihat published works & images
- **Admin users:** Bisa CRUD semua works & images
- **Check via email:** Admin divalidasi via `auth.jwt() ->> 'email'`

### Admin Check

```typescript
// adminUtils.ts
export function isAdmin(userEmail: string | undefined): boolean {
  return ADMIN_EMAILS.includes(userEmail?.toLowerCase() || "");
}
```

---

## 📸 WORKFLOW ADMIN

### Upload Work

1. Fill basic info (title, desc, category)
2. Upload max 6 images
3. Set one as featured (optional, default = first image)
4. Choose status (Published/Unpublished)
5. Submit → Images uploaded ke Storage → Work saved ke DB

### Manage Works

- **List:** View all works dengan preview
- **Edit:** Modify info, set featured, delete images
- **Delete:** Remove entire work

### Gallery Features (User View)

- List published works
- Filter by category
- Featured showcase section
- Detail view dengan image navigation
- Thumbnail grid untuk quick jump

---

## 🛠️ TROUBLESHOOTING

### Upload Gagal

- [ ] Check `.env.local` - Supabase keys valid?
- [ ] Check storage bucket - `work-images` exists & public?
- [ ] Check image size - Max 5MB?
- [ ] Check browser console untuk error messages

### Admin tidak bisa akses `/admin`

- [ ] Email terdaftar di `ADMIN_EMAILS` list?
- [ ] Restart dev server?
- [ ] Clear browser cache & login ulang?

### Images tidak muncul

- [ ] Check Supabase Storage - upload berhasil?
- [ ] Check database - `work_images` record ada?
- [ ] Check RLS policies - work published?

### Redirect loops

- [ ] Check `useAuth()` hook - session correct?
- [ ] Check `isAdmin()` function - email comparison case-sensitive?

---

## 📝 FILE STRUCTURE

```
app/
├── admin/
│   ├── page.tsx                    - Dashboard
│   └── works/
│       ├── page.tsx                - List works
│       ├── create/
│       │   └── page.tsx            - Upload form
│       └── [id]/
│           └── edit/
│               └── page.tsx        - Edit work
├── works/
│   ├── page.tsx                    - Gallery
│   └── [id]/
│       └── page.tsx                - Work detail
├── lib/
│   └── adminUtils.ts               - Admin helpers
└── component/
    └── Navbar.tsx                  - Navigation
```

---

## 🎯 NEXT FEATURES (Optional)

- [ ] Add more categories
- [ ] Add pricing/purchase system
- [ ] Add comments/reviews
- [ ] Add analytics dashboard
- [ ] Add image optimization (compression)
- [ ] Add multiple admin support

---

## 🔗 RELATED FILES

- [Database Schema](./DATABASE_SCHEMA_ADMIN.sql)
- [Admin Utils](../app/lib/adminUtils.ts)
- [Admin Dashboard](../app/admin/page.tsx)
- [Works Gallery](../app/works/page.tsx)

---

**Status:** ✅ Ready to Test  
**Last Updated:** 20 Mei 2026
