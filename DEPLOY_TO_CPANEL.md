# Deploy Vidisto to cPanel - techland.co.tz

## What You Need

✅ cPanel access  
✅ Domain: techland.co.tz  
✅ Node.js support (check with your host)  
✅ Google API Key  

---

## Step 1: Build Frontend (2 minutes)

On your local machine:

```bash
cd web
npm run build
```

This creates the `web/dist` folder with production-ready files.

---

## Step 2: Prepare Files for Upload

### Files to Upload to cPanel:

**For Frontend (public_html/):**
- All contents of `web/dist/` folder
- `.htaccess` file (see `public_html_htaccess` file)

**For Backend (public_html/api/ or subdomain folder):**
- `server/` folder
- `src/` folder  
- `package.json`
- `package-lock.json`
- `.env` file (create this with your Google API key)

---

## Step 3: Upload via cPanel File Manager

1. **Login to cPanel**
2. **Open File Manager**
3. **Navigate to `public_html`**

### Upload Frontend:
- Upload all files from `web/dist/` to `public_html/`
- Upload `.htaccess` to `public_html/`

### Upload Backend:
- Create folder: `public_html/api/` (or use subdomain folder)
- Upload backend files to this folder

---

## Step 4: Create Subdomain for API

1. **cPanel → Subdomains**
2. **Create subdomain:**
   - **Subdomain**: `api`
   - **Domain**: `techland.co.tz`
   - **Document Root**: `public_html/api` (or leave default)
3. **Click "Create"**

Now you have: `api.techland.co.tz`

---

## Step 5: Set Up Node.js Application

1. **cPanel → Software → Node.js Selector**
2. **Click "Create Application"**
3. **Configure:**
   - **Node.js Version**: 18.x or 20.x (latest stable)
   - **Application Mode**: Production
   - **Application Root**: `public_html/api` (or your subdomain folder)
   - **Application URL**: `api.techland.co.tz`
   - **Application Startup File**: `server/index.js`
4. **Click "Create"**

### Add Environment Variables:

In Node.js Selector, click on your app → **Environment Variables**:

```
GOOGLE_API_KEY=your_actual_google_api_key_here
NODE_ENV=production
PORT=3000
```

### Install Dependencies:

Click **"Run NPM Install"** in Node.js Selector, or run via Terminal:

```bash
cd ~/public_html/api
npm install
```

### Start the Application:

Click **"Restart App"** in Node.js Selector

---

## Step 6: Configure Frontend API URL

Rebuild frontend with correct API URL:

```bash
cd web
VITE_API_BASE_URL=https://api.techland.co.tz/api npm run build
```

Then upload the new `dist` contents to `public_html/` again.

---

## Step 7: Set File Permissions

Via cPanel File Manager or Terminal:

```bash
chmod 755 public_html/api/temp
chmod 755 public_html/api/uploads
chmod 644 public_html/api/data/vidsto.db  # if SQLite exists
```

---

## Step 8: Configure CORS

Update `server/app.js` or set environment variable:

**In Node.js Selector → Environment Variables:**
```
CORS_ORIGIN=https://techland.co.tz,https://www.techland.co.tz
```

---

## Step 9: Test Your Deployment

1. **Visit**: `https://techland.co.tz`
2. **Test API**: `https://api.techland.co.tz/api/health` (if you add health endpoint)
3. **Try features:**
   - Sign up
   - Generate video
   - View library

---

## Your URLs

- **Frontend**: `https://techland.co.tz`
- **Backend API**: `https://api.techland.co.tz`
- **API Endpoints**: `https://api.techland.co.tz/api/*`

---

## Troubleshooting

### Node.js App Won't Start
- Check Node.js version (need 18+)
- Check environment variables are set
- Check logs: **Node.js Selector → View Logs**
- Verify `server/index.js` exists

### Frontend Shows Blank Page
- Check `.htaccess` is in `public_html/`
- Check `index.html` exists
- Check browser console for errors
- Verify API URL is correct

### API Not Responding
- Check Node.js app is running (green status)
- Check CORS settings
- Test: `curl https://api.techland.co.tz/api/health`
- Check error logs in cPanel

### File Upload Errors
- Check directory permissions (755)
- Check disk space quota
- Verify write permissions

---

## Alternative: Single Domain Setup

If you prefer everything on one domain:

1. **Backend runs on**: Port assigned by cPanel
2. **Frontend on**: `techland.co.tz`
3. **Use Apache reverse proxy** for `/api/*` routes

**`.htaccess` for single domain:**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  
  # Proxy API calls to Node.js (adjust port as needed)
  RewriteCond %{REQUEST_URI} ^/api [NC]
  RewriteRule ^api/(.*)$ http://localhost:3000/api/$1 [P,L]
  
  # Serve React app
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Note**: Requires `mod_proxy` enabled in Apache (contact your host).

---

## Quick Checklist

- [ ] Frontend built (`npm run build`)
- [ ] Files uploaded to cPanel
- [ ] Subdomain `api.techland.co.tz` created
- [ ] Node.js app created in cPanel
- [ ] Environment variables set
- [ ] Dependencies installed (`npm install`)
- [ ] Node.js app started
- [ ] `.htaccess` in place
- [ ] CORS configured
- [ ] SSL enabled (AutoSSL)
- [ ] Tested deployment

---

## Need Help?

1. Check **cPanel → Metrics → Errors** for Apache errors
2. Check **Node.js Selector → Logs** for Node.js errors
3. Test API directly: `curl https://api.techland.co.tz/api/health`
4. Check browser console (F12) for frontend errors

---

**You're all set! Your app will be live at techland.co.tz 🚀**


