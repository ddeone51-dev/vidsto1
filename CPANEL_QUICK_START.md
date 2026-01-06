# Quick cPanel Deployment - techland.co.tz

## Fastest Path (15 minutes)

### Step 1: Build Frontend (2 min)
```bash
cd web
npm run build
```
This creates `web/dist` folder with production files.

### Step 2: Upload Files via cPanel File Manager (5 min)

1. **Login to cPanel**
2. **File Manager → public_html**
3. **Upload these:**
   - All contents of `web/dist/` → to `public_html/`
   - **Backend files to `public_html/api/` folder:**
     - `server/` folder (entire folder with all files)
     - `src/` folder (entire folder with all files)
     - `package.json` (root level)
     - `package-lock.json` (root level, optional but recommended)
     - `vertex-sa.json` (if using Vertex AI, otherwise skip)
     - `data/` folder (empty folder is fine, database will be created automatically)
     - Create `temp/` and `uploads/` folders (empty folders, server will create subfolders)

### Step 3: Set Up Node.js App (5 min)

1. **cPanel → Software → Node.js Selector**
2. **Create Application:**
   - **Application root**: `public_html/api`
   - **Application URL**: `api.techland.co.tz` (create subdomain first)
   - **Startup file**: `server/index.js`
3. **Add Environment Variable:**
   - `GOOGLE_API_KEY=your_key`
4. **Click "Create" → "Run NPM Install"**

### Step 4: Create Subdomain (2 min)

1. **cPanel → Subdomains**
2. **Create:** `api.techland.co.tz`
3. **Document root**: `public_html/api`

### Step 5: Configure Frontend (1 min)

Create `public_html/.htaccess`:
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

Rebuild frontend with API URL:
```bash
cd web
VITE_API_BASE_URL=https://api.techland.co.tz/api npm run build
```

Upload new `dist` contents to `public_html/`

### Step 6: Test (2 min)

- Visit: `https://techland.co.tz`
- Test: Sign up, generate video

---

## That's It! 🎉

Your app should now be live at:
- **Frontend**: https://techland.co.tz
- **Backend**: https://api.techland.co.tz

---

## If Node.js Not Available in cPanel

**Option A**: Deploy backend to Railway (free), frontend to cPanel
**Option B**: Contact your host to enable Node.js
**Option C**: Use VPS with Node.js + PM2

See `CPANEL_DEPLOYMENT.md` for detailed instructions.


