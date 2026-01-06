# Deployment Guide: Frontend on StackCP, Backend on Railway

Since StackCP cPanel doesn't have Node.js support, we'll deploy:
- **Frontend**: StackCP cPanel (already uploaded ✅)
- **Backend**: Railway (free tier)

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (easiest way)
3. Click "New Project"

### 1.2 Connect Your Repository

**Option A: If you have code on GitHub**
1. Click "Deploy from GitHub repo"
2. Select your repository
3. Railway will detect it automatically

**Option B: If code is only local (no GitHub)**
1. You'll need to create a GitHub repository first
2. Or use Railway CLI to deploy directly

### 1.3 Configure Railway Project

1. **Railway will auto-detect** your project
2. **Root Directory**: Leave as root (`.`)
3. **Build Command**: (usually auto-detected, but verify)
   ```
   npm install
   ```
4. **Start Command**:
   ```
   node server/index.js
   ```
5. **Watch Paths**: Leave default

### 1.4 Set Environment Variables

In Railway dashboard, go to your project → Variables tab, add:

```
NODE_ENV=production
PORT=4000
GOOGLE_API_KEY=your_google_api_key_here
JWT_SECRET=generate_a_random_secure_string_here
```

**Optional (if using):**
```
LEONARDO_API_KEY=your_key_if_using_leonardo
IMAGE_PROVIDER=imagen (or leonardo or vertex)
GOOGLE_APPLICATION_CREDENTIALS=./vertex-sa.json (if using Vertex AI)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_LOCATION=us-central1
```

### 1.5 Upload vertex-sa.json (if using Vertex AI)

If you're using Vertex AI:
1. In Railway dashboard → Your service → Variables
2. Scroll down to "Files" section
3. Click "Add File"
4. Name: `vertex-sa.json`
5. Paste the contents of your `vertex-sa.json` file

### 1.6 Deploy

1. Railway will automatically start deploying
2. Wait for deployment to complete (2-5 minutes)
3. Railway will provide a URL like: `https://your-app-name.up.railway.app`

### 1.7 Get Your Backend URL

1. In Railway dashboard → Your service → Settings
2. Generate a domain (or use the default railway.app domain)
3. Copy the URL - this is your backend API URL
4. Example: `https://vidsto-api.up.railway.app`

---

## Step 2: Update Frontend to Use Railway Backend

### 2.1 Rebuild Frontend with Railway API URL

On your local machine:

```bash
cd web
VITE_API_BASE_URL=https://your-railway-url.up.railway.app/api npm run build
```

Replace `your-railway-url.up.railway.app` with your actual Railway URL.

### 2.2 Upload Updated Frontend to StackCP

1. Go to StackCP cPanel → File Manager
2. Navigate to `public_html/`
3. Delete old files (or backup first)
4. Upload all contents of `web/dist/` folder

### 2.3 Create/Update .htaccess

Ensure `public_html/.htaccess` exists with:

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

---

## Step 3: Configure CORS on Railway Backend

Your backend needs to allow requests from your StackCP domain.

### Option A: Update server/app.js (if you have access)

Update the CORS configuration in `server/app.js` to include your domain.

### Option B: Set Environment Variable in Railway

Add to Railway Variables:
```
CORS_ORIGIN=https://techland.co.tz,https://www.techland.co.tz
```

---

## Step 4: Test Your Deployment

1. **Frontend**: Visit `https://techland.co.tz`
2. **Backend**: Test `https://your-railway-url.up.railway.app/api/health` (if you have a health endpoint)
3. Try signing up / logging in
4. Test video generation

---

## Step 5: Set Up Custom Domain for Railway (Optional)

If you want `api.techland.co.tz` to point to Railway:

1. In Railway → Your service → Settings → Networking
2. Click "Generate Domain" or add custom domain
3. Add custom domain: `api.techland.co.tz`
4. Railway will give you DNS records to add
5. Go to StackCP → DNS Zone Editor (or your domain registrar)
6. Add the CNAME record Railway provides
7. Wait for DNS propagation (5-30 minutes)

Then rebuild frontend with:
```bash
VITE_API_BASE_URL=https://api.techland.co.tz/api npm run build
```

---

## Railway Free Tier Limits

- **$5 free credit per month**
- **500 hours of usage**
- **Should be enough for small to medium traffic**

---

## Troubleshooting

### Backend Not Starting
- Check Railway logs: Railway dashboard → Deployments → View logs
- Verify all environment variables are set
- Check that `server/index.js` is the correct entry point

### CORS Errors
- Verify CORS_ORIGIN includes your frontend domain
- Check browser console for specific error messages

### API Not Responding
- Verify Railway service is running (green status)
- Check Railway logs for errors
- Test the Railway URL directly in browser

### Frontend Can't Connect to Backend
- Verify VITE_API_BASE_URL is correct in built files
- Check browser Network tab for API calls
- Ensure Railway URL doesn't have trailing slash

---

## Alternative: Render.com

If Railway doesn't work for you, try Render.com (also has free tier):

1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Environment**: Node
5. Add environment variables
6. Deploy

---

## Summary

✅ Frontend: StackCP cPanel (`techland.co.tz`)  
✅ Backend: Railway (`your-app.up.railway.app` or `api.techland.co.tz`)  
✅ Free tier available  
✅ Easy to update and maintain

