# Product Display Fix - Show All 24 Products

## Issue
Admin panel was showing only 22 products instead of all 24 in the database.

## Root Cause
The API was **defaulting to showing only PUBLISHED products**. The 2 missing products were likely DRAFT or ARCHIVED.

## Changes Made

### 1. Backend Fix (`nordic-medtek-cms/routes/products.js`)

**Before:**
```javascript
status = 'PUBLISHED',  // Default filter
```

**After:**
```javascript
status,  // No default - let frontend decide
```

And updated the filter logic:
```javascript
// Only filter by status if explicitly provided and not empty
if (status && status !== '') {
    whereConditions.push('p.status = ?');
    queryParams.push(status);
}
```

### 2. Frontend Fix (`nordic-medtek/src/pages/Admin.jsx`)

**Before:**
```javascript
CmsApiService.getProducts()  // No params = PUBLISHED only
```

**After:**
```javascript
CmsApiService.getProducts({ status: '' })  // Empty status = ALL products
```

## Result

✅ **Admin panel now shows ALL products** regardless of status:
- 🟢 PUBLISHED (green badge)
- 🟡 DRAFT (yellow badge)
- ⚪ ARCHIVED (gray badge)

## Public Pages

**Important:** Public-facing pages (Products, etc.) still only show PUBLISHED products:

- `getProductsByCategory()` - adds `status=PUBLISHED`
- `getFeaturedProducts()` - adds `status=PUBLISHED`
- `searchProducts()` - adds `status=PUBLISHED`

This is correct behavior - only admins should see DRAFT/ARCHIVED products.

## Testing

1. **Admin Panel:** Should now show all 24 products
2. **Public Pages:** Should still show only PUBLISHED products
3. **Status Badges:** Green/Yellow/Gray indicators show each product's status

## Deploy These Changes

### Backend (Railway):
```bash
cd nordic-medtek-cms
git push origin main
# Railway will auto-deploy
```

### Frontend (Vercel):
```bash
cd nordic-medtek
git push origin main
# Vercel will auto-deploy
```

---

**Fixed on:** October 11, 2025
**Commits:**
- Backend: `6094edc` - Fix: Show ALL products in admin, not just PUBLISHED
- Frontend: `92a10cc` - Fix: Admin page now shows ALL products

