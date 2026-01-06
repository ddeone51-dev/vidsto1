# Vidisto Deployment on cPanel - techland.co.tz

This guide is specifically for deploying Vidisto on cPanel hosting with your domain `techland.co.tz`.

## Prerequisites

- ✅ cPanel access
- ✅ Domain: techland.co.tz
- ✅ Node.js support in cPanel (check with your host)
- ✅ Google API Key

---

## Option 1: Full cPanel Deployment (Recommended if Node.js is supported)

### Step 1: Prepare Your Files

1. **Build the frontend:**
   ```bash
   cd web
   npm run build
   ```
   This creates a `dist` folder with production files.

2. **Prepare backend files:**
   - Keep all server files
   - Keep `package.json` in root
   - Keep `node_modules` (or reinstall on server)

### Step 2: Upload to cPanel

1. **Login to cPanel**
2. **Go to File Manager**
3. **Navigate to your domain's root** (usually `public_html` or `techland.co.tz`)
4. **Upload all files** via:
   - File Manager → Upload
   - Or use FTP/SFTP client (FileZilla, WinSCP)

### Step 3: Install Dependencies

**Via cPanel Terminal (if available):**
```bash
cd ~/public_html  # or your domain directory
npm install
cd web
npm install
npm run build
```

**Or via SSH:**
```bash
ssh your-username@techland.co.tz
cd public_html
npm install
cd web && npm install && npm run build
```

### Step 4: Configure Node.js App (if cPanel has Node.js Selector)

1. **Go to cPanel → Software → Node.js Selector**
2. **Create Node.js App:**
   - **Node.js version**: 18.x or 20.x
   - **Application root**: `public_html` (or your domain folder)
   - **Application URL**: `techland.co.tz` (or subdomain)
   - **Application startup file**: `server/index.js`
   - **Application mode**: Production
3. **Set Environment Variables:**
   - `GOOGLE_API_KEY=your_key_here`
   - `NODE_ENV=production`
   - `PORT=3000` (or port assigned by cPanel)
4. **Click "Create"**

### Step 5: Configure Frontend

**Option A: Serve from subdomain (Recommended)**
- Frontend: `www.techland.co.tz` or `techland.co.tz`
- Backend API: `api.techland.co.tz`

**Option B: Serve from same domain**
- Frontend: `techland.co.tz` (static files)
- Backend: `techland.co.tz/api` (Node.js app)

### Step 6: Set Up Reverse Proxy (if needed)

If your cPanel doesn't support Node.js directly, use Apache reverse proxy:

1. **Create `.htaccess` in public_html:**
```apache
# Serve frontend files
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Don't rewrite API calls - proxy to Node.js
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]
  
  # Serve React app for all other routes
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

2. **Enable mod_proxy in Apache** (contact your host if not enabled)

---

## Option 2: Traditional cPanel Deployment (No Node.js Support)

If your cPanel doesn't support Node.js, you have two options:

### Option 2A: Deploy Backend Elsewhere, Frontend on cPanel

1. **Deploy backend to Railway/Render** (free tier)
2. **Deploy frontend to cPanel:**
   - Upload `web/dist` contents to `public_html`
   - Set `VITE_API_BASE_URL` to your Railway/Render backend URL

### Option 2B: Use PM2/forever on VPS

If you have VPS access:
1. Install Node.js on VPS
2. Use PM2 to run backend: `pm2 start server/index.js`
3. Serve frontend from cPanel

---

## Recommended Setup for techland.co.tz

### Structure:
```
techland.co.tz (main domain)
├── Frontend: www.techland.co.tz or techland.co.tz
└── Backend API: api.techland.co.tz (subdomain)
```

### Step-by-Step:

#### 1. Create Subdomain for API

1. **cPanel → Subdomains**
2. **Create subdomain:**
   - Subdomain: `api`
   - Document root: `public_html/api` (or separate folder)
3. **Click "Create"**

#### 2. Deploy Backend to api.techland.co.tz

1. **Upload backend files** to `public_html/api` (or subdomain folder)
2. **Set up Node.js app** pointing to `api.techland.co.tz`
3. **Configure environment variables**

#### 3. Deploy Frontend to techland.co.tz

1. **Build frontend:**
   ```bash
   cd web
   npm run build
   ```
2. **Upload `web/dist` contents** to `public_html`
3. **Create `.htaccess`** in `public_html`:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

#### 4. Configure Frontend API URL

Create `public_html/.env.production` or update build:
```env
VITE_API_BASE_URL=https://api.techland.co.tz/api
```

Or rebuild with:
```bash
VITE_API_BASE_URL=https://api.techland.co.tz/api npm run build
```

---

## Environment Variables Setup

### Backend (Node.js App in cPanel)

1. **cPanel → Node.js Selector → Your App → Environment Variables**
2. **Add:**
   ```
   GOOGLE_API_KEY=your_google_api_key
   NODE_ENV=production
   PORT=3000
   ```

### Or via `.env` file:

Create `public_html/api/.env`:
```env
GOOGLE_API_KEY=your_google_api_key
NODE_ENV=production
PORT=3000
```

---

## File Structure on cPanel

```
public_html/
├── index.html (from web/dist)
├── assets/ (from web/dist/assets)
├── .htaccess (for frontend routing)
└── api/ (subdomain folder)
    ├── server/
    ├── src/
    ├── package.json
    ├── .env
    └── node_modules/
```

---

## Database Setup

### Option 1: Keep SQLite (Simplest)
- SQLite file will be in your cPanel directory
- Works if you have write permissions
- **Location**: `public_html/api/data/vidsto.db`

### Option 2: Use cPanel MySQL
1. **cPanel → MySQL Databases**
2. **Create database**: `vidsto_db`
3. **Create user** and grant privileges
4. **Update `server/db.js`** to use MySQL instead of SQLite

---

## File Storage

### Current Setup (Local Files)
- Files stored in `temp/` and `uploads/`
- **Ensure write permissions** on these directories
- Set permissions: `chmod 755 temp uploads`

### Better: Use cPanel File Manager
- Create `public_html/api/uploads` folder
- Set permissions to 755
- Update paths in code if needed

---

## CORS Configuration

Update `server/app.js` CORS to allow your domain:

```javascript
const corsOptions = {
  origin: [
    'https://techland.co.tz',
    'https://www.techland.co.tz',
    'http://localhost:5173' // Keep for local dev
  ],
  credentials: true
};
```

Or set environment variable:
```
CORS_ORIGIN=https://techland.co.tz,https://www.techland.co.tz
```

---

## SSL/HTTPS Setup

1. **cPanel → SSL/TLS Status**
2. **Run AutoSSL** (if available)
3. **Or install Let's Encrypt SSL:**
   - cPanel → SSL/TLS → Let's Encrypt
   - Select your domain
   - Click "Run AutoSSL" or "Install"

---

## Testing Your Deployment

1. **Frontend**: Visit `https://techland.co.tz`
2. **Backend API**: Test `https://api.techland.co.tz/api/health` (if you add health endpoint)
3. **Test features:**
   - [ ] Sign up / Login
   - [ ] Generate video
   - [ ] View library
   - [ ] Download videos

---

## Troubleshooting

### Node.js App Not Starting
- Check Node.js version (need 18+)
- Check environment variables
- Check logs in cPanel → Node.js Selector → Logs
- Verify `server/index.js` is the correct entry point

### Frontend Not Loading
- Check `.htaccess` is in place
- Verify `index.html` is in `public_html`
- Check file permissions (644 for files, 755 for directories)

### API Not Responding
- Verify Node.js app is running
- Check CORS settings
- Verify API URL in frontend matches backend
- Check Apache reverse proxy configuration

### File Upload Errors
- Check directory permissions (`chmod 755 uploads temp`)
- Verify write permissions
- Check disk space quota

### Database Errors
- Check SQLite file permissions
- Verify database directory exists
- Check write permissions on database file

---

## Quick Deployment Checklist

- [ ] Frontend built (`npm run build` in `web` folder)
- [ ] Backend files uploaded to cPanel
- [ ] Node.js app created in cPanel
- [ ] Environment variables set (`GOOGLE_API_KEY`)
- [ ] Subdomain created for API (`api.techland.co.tz`)
- [ ] Frontend files uploaded to `public_html`
- [ ] `.htaccess` created for frontend routing
- [ ] CORS configured for your domain
- [ ] SSL certificate installed
- [ ] File permissions set correctly
- [ ] Tested all features

---

## Alternative: Simple Single-Domain Setup

If you want everything on one domain:

1. **Backend runs on**: `techland.co.tz:3000` (or assigned port)
2. **Frontend served from**: `techland.co.tz` (static files)
3. **Apache reverse proxy** routes `/api/*` to Node.js backend
4. **Frontend routes** handled by `.htaccess`

**`.htaccess` for single domain:**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Proxy API calls to Node.js backend
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]
  
  # Serve React app for all other routes
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## Need Help?

1. Check cPanel error logs: **cPanel → Metrics → Errors**
2. Check Node.js logs: **cPanel → Node.js Selector → Logs**
3. Test API directly: `curl https://api.techland.co.tz/api/health`
4. Check browser console for frontend errors

---

## Cost

- **cPanel hosting**: Your existing plan
- **Domain**: Already have techland.co.tz
- **Total additional cost**: $0 (if Node.js is included)

---

**You're ready to deploy! 🚀**


