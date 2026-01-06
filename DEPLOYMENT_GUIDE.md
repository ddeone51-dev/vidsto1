# Vidisto Deployment Guide

This guide will help you deploy Vidisto to a live domain and hosting service.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Options](#deployment-options)
3. [Recommended: Railway Deployment](#recommended-railway-deployment)
4. [Alternative: Render Deployment](#alternative-render-deployment)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [File Storage](#file-storage)
8. [Domain Configuration](#domain-configuration)
9. [Post-Deployment](#post-deployment)

---

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Google API Key (for Gemini AI, Imagen, TTS, Speech-to-Text)
- [ ] Domain name (optional but recommended)
- [ ] GitHub account (for code repository)
- [ ] Account on chosen hosting platform

---

## Deployment Options

### Recommended Platforms:

1. **Railway** (Recommended)
   - Easy setup, automatic deployments
   - Free tier available
   - Supports Node.js and static sites
   - Built-in PostgreSQL option

2. **Render**
   - Free tier available
   - Easy GitHub integration
   - Supports both backend and frontend

3. **Vercel + Railway/Render**
   - Vercel for frontend (excellent for React)
   - Railway/Render for backend

4. **DigitalOcean App Platform**
   - More control, paid service
   - Good for production

5. **AWS/GCP/Azure**
   - Enterprise-grade, more complex setup
   - Better for large-scale deployments

---

## Recommended: Railway Deployment

Railway is the easiest option for full-stack apps.

### Step 1: Prepare Your Code

1. **Create a `.railwayignore` file** (similar to `.gitignore`):
```
node_modules
.env
.env.local
temp/
*.log
.DS_Store
```

2. **Update `package.json` scripts** (if needed):
```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "node server/index.js",
    "dev:client": "cd web && npm run dev",
    "build": "cd web && npm run build",
    "postinstall": "cd web && npm install"
  }
}
```

3. **Create `railway.json` or `Procfile`**:
```
web: node server/index.js
```

### Step 2: Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Create a GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/vidsto.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Railway

1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Railway will auto-detect Node.js

### Step 4: Configure Environment Variables

In Railway dashboard, go to your project → Variables tab, add:

```
GOOGLE_API_KEY=your_google_api_key_here
NODE_ENV=production
PORT=4000
```

### Step 5: Configure Build Settings

In Railway, set:
- **Root Directory**: `/` (root of repo)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### Step 6: Deploy Frontend Separately (Recommended)

For better performance, deploy frontend separately:

**Option A: Vercel (Recommended for Frontend)**

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set **Root Directory** to `web`
4. Set **Build Command** to `npm run build`
5. Set **Output Directory** to `dist`
6. Add environment variable:
   ```
   VITE_API_URL=https://your-railway-backend.railway.app
   ```

**Option B: Railway Static Site**

1. Create a new service in Railway
2. Select "Static Site"
3. Point to `web` directory
4. Set build command: `npm run build`
5. Set output directory: `dist`

### Step 7: Update API URLs

In `web/src/api/client.ts`, update the base URL:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV 
    ? "http://localhost:4000" 
    : "https://your-backend-url.railway.app");
```

---

## Alternative: Render Deployment

### Backend on Render

1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: vidsto-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Root Directory**: `/`

6. Add environment variables (same as Railway)

### Frontend on Render

1. Click "New +" → "Static Site"
2. Connect repository
3. Configure:
   - **Name**: vidsto-frontend
   - **Build Command**: `cd web && npm install && npm run build`
   - **Publish Directory**: `web/dist`
   - **Root Directory**: `web`

---

## Environment Variables

### Backend Environment Variables

Create a `.env` file or set in hosting platform:

```env
# Google API Key (Required)
GOOGLE_API_KEY=your_google_api_key_here

# Server Configuration
NODE_ENV=production
PORT=4000

# Database (if using external database)
DATABASE_URL=postgresql://user:password@host:port/database

# CORS (if needed)
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend Environment Variables

In Vercel/Render frontend settings:

```env
VITE_API_URL=https://your-backend-url.railway.app
```

---

## Database Setup

### Option 1: Keep SQLite (Simple, but not recommended for production)

- SQLite files are stored in the project
- Works for small-scale deployments
- **Limitation**: Not ideal for multiple instances

### Option 2: PostgreSQL (Recommended for Production)

1. **On Railway:**
   - Add PostgreSQL service
   - Railway provides connection string automatically

2. **Update database code:**
   - Modify `server/db.js` to use PostgreSQL
   - Use `pg` or `better-sqlite3` with PostgreSQL adapter

3. **Migration:**
   - Export data from SQLite
   - Import to PostgreSQL

### Option 3: External Database (Supabase, PlanetScale, etc.)

- Use Supabase (free PostgreSQL)
- Or PlanetScale (MySQL)
- Update connection strings in environment variables

---

## File Storage

### Current Setup (Local Files)
- Files stored in `temp/` and `uploads/` directories
- **Issue**: These directories are ephemeral on most platforms

### Recommended: Cloud Storage

**Option 1: AWS S3**
```javascript
// Install: npm install @aws-sdk/client-s3
// Configure S3 bucket
// Update file upload/download code
```

**Option 2: Cloudinary**
```javascript
// Install: npm install cloudinary
// Free tier available
// Good for images and videos
```

**Option 3: Railway Volumes**
- Railway offers persistent volumes
- Mount volume to `/uploads` directory
- Files persist across deployments

**Option 4: Render Disk**
- Render provides persistent disk storage
- Mount to specific directory

### Quick Fix: Use Railway/Render Persistent Storage

**Railway:**
1. Add "Volume" service
2. Mount to `/uploads` and `/temp`
3. Files will persist

**Render:**
1. Use "Disk" feature
2. Mount to persistent directory

---

## Domain Configuration

### Step 1: Get a Domain

- Purchase from Namecheap, GoDaddy, Google Domains, etc.
- Or use free subdomain from hosting platform

### Step 2: Configure Backend Domain

**Railway:**
1. Go to project → Settings → Domains
2. Click "Generate Domain" or "Add Custom Domain"
3. For custom domain, add CNAME record:
   ```
   Type: CNAME
   Name: api (or @)
   Value: your-app.railway.app
   ```

**Render:**
1. Go to service → Settings → Custom Domain
2. Add your domain
3. Follow DNS instructions

### Step 3: Configure Frontend Domain

**Vercel:**
1. Go to project → Settings → Domains
2. Add your domain
3. Update DNS records as instructed

**Render:**
1. Same as backend
2. Point domain to static site

### Step 4: Update CORS

In `server/app.js`, update CORS origin:

```javascript
app.use(cors({
  origin: [
    'https://your-frontend-domain.com',
    'https://www.your-frontend-domain.com',
    'http://localhost:5173' // Keep for local dev
  ],
  credentials: true
}));
```

### Step 5: Update Frontend API URL

Update `web/src/api/client.ts`:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV 
    ? "http://localhost:4000" 
    : "https://api.your-domain.com"); // Your backend domain
```

---

## Post-Deployment

### 1. Test Your Deployment

- [ ] Frontend loads correctly
- [ ] Backend API responds
- [ ] User registration/login works
- [ ] Video generation works
- [ ] File uploads work
- [ ] Database operations work

### 2. Set Up Monitoring

- **Railway**: Built-in logs and metrics
- **Render**: Built-in logs
- **Sentry**: Error tracking (optional)
- **Uptime Robot**: Uptime monitoring (free)

### 3. Set Up Backups

- Database backups (if using PostgreSQL)
- File storage backups
- Environment variable backups

### 4. SSL/HTTPS

- Railway/Render/Vercel provide SSL automatically
- Custom domains get SSL via Let's Encrypt

### 5. Performance Optimization

- Enable CDN for static assets
- Optimize images
- Enable compression
- Set up caching headers

---

## Quick Start: Railway (Step-by-Step)

### 1. Prepare Repository

```bash
# Ensure all code is committed
git add .
git commit -m "Ready for deployment"
git push
```

### 2. Deploy Backend

1. Go to railway.app → New Project → Deploy from GitHub
2. Select your repository
3. Add environment variables:
   - `GOOGLE_API_KEY`
   - `NODE_ENV=production`
   - `PORT=4000`
4. Railway will auto-deploy

### 3. Deploy Frontend to Vercel

1. Go to vercel.com → Add New Project
2. Import GitHub repository
3. Configure:
   - Framework Preset: Vite
   - Root Directory: `web`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variable:
   - `VITE_API_URL` = Your Railway backend URL
5. Deploy

### 4. Connect Domain

1. **Backend (Railway):**
   - Settings → Domains → Add Custom Domain
   - Update DNS: CNAME `api.yourdomain.com` → Railway URL

2. **Frontend (Vercel):**
   - Settings → Domains → Add Domain
   - Update DNS: A record `@` → Vercel IPs
   - CNAME `www` → Vercel URL

### 5. Update Environment Variables

- Frontend: `VITE_API_URL=https://api.yourdomain.com`
- Backend: Update CORS to allow frontend domain

---

## Troubleshooting

### Common Issues:

1. **"Cannot find module" errors**
   - Ensure `package.json` has all dependencies
   - Run `npm install` in both root and `web` directories

2. **Database errors**
   - Check database file permissions
   - For SQLite, ensure write permissions
   - Consider switching to PostgreSQL

3. **File upload errors**
   - Check file storage directory permissions
   - Use cloud storage (S3, Cloudinary) for production

4. **CORS errors**
   - Update CORS origin in backend
   - Ensure frontend URL is in allowed origins

5. **Environment variables not working**
   - Check variable names (case-sensitive)
   - Restart service after adding variables
   - Verify in hosting platform dashboard

---

## Cost Estimation

### Free Tier Options:
- **Railway**: $5/month free credit (usually enough for small apps)
- **Render**: Free tier available (with limitations)
- **Vercel**: Free tier for frontend (generous limits)
- **Domain**: ~$10-15/year

### Paid Options (if needed):
- **Railway**: Pay-as-you-go after free credit
- **Render**: $7/month for web services
- **Database**: Free PostgreSQL on Railway/Render
- **Storage**: Free tiers on S3/Cloudinary

---

## Security Checklist

- [ ] Use HTTPS (automatic on most platforms)
- [ ] Keep environment variables secret
- [ ] Enable CORS properly
- [ ] Use strong database passwords
- [ ] Enable rate limiting (if needed)
- [ ] Regular security updates
- [ ] Backup strategy in place

---

## Support

If you encounter issues:
1. Check hosting platform logs
2. Verify environment variables
3. Test API endpoints directly
4. Check browser console for frontend errors
5. Review this guide's troubleshooting section

---

## Next Steps

After deployment:
1. Test all features thoroughly
2. Set up monitoring
3. Configure backups
4. Set up CI/CD for automatic deployments
5. Consider adding analytics
6. Set up error tracking (Sentry)

Good luck with your deployment! 🚀


