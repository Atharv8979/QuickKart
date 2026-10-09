# QuickKart Production Deployment & Real Database Setup Guide

This guide explains how to transition QuickKart from the in-memory development engine to your **live Supabase PostgreSQL database** and deploy the full stack to production.

---

## 1. Database Architecture: Real PostgreSQL vs. Fallback

The backend uses a **dual-engine design**:
* **Live Supabase Mode**: Automatically activated when valid `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided in the environment. All admin, customer, and shopkeeper operations execute real SQL queries against PostgreSQL tables.
* **Resilient In-Memory Mode**: Used during local development or when credentials are not configured, so development and testing never crash.

All Admin endpoints now have **direct Supabase queries** wired with:
- PostGIS point geometries for geospatial queries (`shops.geom`).
- `bcryptjs` password hashing for new admin users (`password_hash`).
- Foreign keys and cascading deletes across users, stores, products, and hold tickets.

---

## 2. Step-by-Step Real Database Setup (5 Minutes)

### Step 1: Create your Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, choose an organization, set a project name (e.g., `QuickKart-DB`), set a database password, and choose your preferred region.

### Step 2: Run the Database Migration Script
1. In your Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **+ New query**.
3. Open [`backend/supabase_schema.sql`](file:///d:/project/QuickKart/backend/supabase_schema.sql) in this repository, copy the entire SQL script, paste it into the editor, and click **Run**.
4. This will create:
   - `postgis` extension.
   - 8 core tables: `users`, `shops`, `products`, `categories`, `requests`, `request_responses`, `reservations`, and `reviews`.
   - PostGIS geometry trigger `update_shop_geom()`.
   - Seed data for admin, shopkeepers, and verified neighborhood stores.

For an existing Supabase project, also run [`backend/migrations/request_bargaining.sql`](./migrations/request_bargaining.sql) in the SQL Editor. It adds persisted negotiation history and agreement price fields and permits accepted, rejected, and bargaining request statuses.

### Step 3: Configure Environment Variables
1. In Supabase Dashboard, go to **Project Settings** &rarr; **API**.
2. Copy your **Project URL** and your **`service_role` secret key** (under Project API keys).
3. Create a `.env` file in `d:\project\QuickKart\backend\.env`:
```env
PORT=5000
NODE_ENV=production
JWT_SECRET=quickkart_production_jwt_secret_secure_key_2026

# Paste your Supabase credentials here:
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-secret-key
```

### Step 4: Verify Connection
Restart the backend:
```bash
node server.js
```
The console will log:
```
[Supabase] ✅ Connected successfully to Supabase PostgreSQL database!
====================================================
  🚀 QuickKart Backend API Server running on port 5000
  📍 Hyperlocal Product Discovery & Connectivity Ready
====================================================
```

---

## 3. Deploying to Cloud Hosting Providers

### Option A: Deploy Backend to Render / Railway
1. **Repository**: Push this repository to GitHub or GitLab.
2. **Root Directory**: Set root directory to `backend`.
3. **Build Command**: `npm install`
4. **Start Command**: `node server.js`
5. **Environment Variables**:
   * `PORT`: `5000`
   * `NODE_ENV`: `production`
   * `JWT_SECRET`: (Your secret string)
   * `SUPABASE_URL`: (Your Supabase URL)
   * `SUPABASE_SERVICE_ROLE_KEY`: (Your Supabase service role key)

### Option B: Deploy Frontend to Vercel / Netlify
1. **Root Directory**: `frontend`
2. **Build Command**: `npm run build`
3. **Output Directory**: `dist`
4. **Environment Variables**:
   * `VITE_API_URL`: `https://your-backend-app.onrender.com` (your deployed backend URL).

---

## 4. Production Checklist

- [x] Admin Panel CRUD functions verified (Users, Stores, Catalog Products, Categories, Reports, Interactive Map).
- [x] Cross-role live synchronization verified (Customer <-> Shopkeeper <-> Admin).
- [x] PostGIS spatial querying support in schema.
- [x] Password hashing with bcrypt before database insert.
- [x] Production bundle builds with 0 errors (`dist/` created in 10.98s).
- [ ] Connect your Supabase project credentials in `backend/.env`.
