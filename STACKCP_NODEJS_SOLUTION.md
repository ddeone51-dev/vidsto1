# StackCP Node.js Setup Solution

## The Problem

Your home directory (`/home/sites/17b`) is mounted with the `noexec` flag, which prevents executing binaries directly. This is a security restriction on shared hosting that cannot be changed via SSH.

**This means:**
- ❌ Cannot install Node.js manually via nvm or direct download
- ❌ Cannot execute binaries from your home directory
- ✅ **BUT**: StackCP likely provides Node.js through cPanel's Node.js Selector

---

## Solution: Use cPanel Node.js Selector

### Step 1: Check if Node.js Selector is Available

1. **Login to StackCP cPanel**
2. Look for one of these options:
   - **Software** → **Node.js Selector**
   - **Software** → **Setup Node.js App**
   - **Node.js** (in main cPanel menu)
   - **Application Manager** → **Node.js**

### Step 2: Create Node.js Application (if available)

If you find Node.js Selector:

1. **Click "Create Application"** or **"Setup Node.js App"**

2. **Configure the application:**
   - **Application root**: `/home/sites/17b/2/2fbc5b2a79/public_html/api`
   - **Application URL**: Choose one:
     - `api.techland.co.tz` (requires subdomain setup)
     - OR use existing domain: `techland.co.tz/api`
   - **Node.js version**: Select **18.x** or latest LTS
   - **Application mode**: **Production**
   - **Startup file**: `server/index.js`

3. **Environment Variables** (add these):
   ```
   NODE_ENV=production
   PORT=4000
   GOOGLE_API_KEY=your_google_api_key_here
   JWT_SECRET=your_jwt_secret_here
   CORS_ORIGIN=https://techland.co.tz,https://www.techland.co.tz
   ```

4. **Click "Create"** or **"Setup"**

5. **After creation, click "Run NPM Install"** to install dependencies

6. **Start the application** (usually automatic, but check status)

---

## Alternative: Contact StackCP Support

If Node.js Selector is NOT available in your cPanel:

### What to Ask Support:

**Option 1: Request Node.js Access**
```
Hi, I need to run a Node.js application on my hosting account. 
Can you please:
1. Enable Node.js Selector in my cPanel, OR
2. Install Node.js and make it available via SSH, OR
3. Provide instructions for running Node.js applications on StackCP?
```

**Option 2: Request Execution Permission** (less likely to work)
```
Hi, I'm trying to run Node.js from my home directory but getting 
"Permission denied" errors. The NFS mount has noexec flag. 
Can you help me set up Node.js execution?
```

---

## Alternative Solution: Deploy Backend Separately

If StackCP doesn't support Node.js, deploy your backend to a free service:

### Option A: Railway (Recommended - Free Tier)
1. Go to https://railway.app
2. Connect your GitHub repository
3. Set root directory to project root
4. Set start command: `node server/index.js`
5. Add environment variables
6. Deploy automatically

### Option B: Render (Free Tier)
1. Go to https://render.com
2. Create new Web Service
3. Connect repository
4. Set build command: `npm install`
5. Set start command: `node server/index.js`
6. Add environment variables

Then update your frontend to point to the new backend URL.

---

## Current Status

✅ **SSH Access**: Working  
✅ **API Directory**: Exists at `~/public_html/api`  
✅ **Files Uploaded**: package.json, server/, src/ all present  
❌ **Node.js Execution**: Blocked by `noexec` on NFS mount  

---

## Next Steps

1. **First**: Check cPanel for Node.js Selector (5 minutes)
2. **If available**: Use it to set up your app (10 minutes)
3. **If not available**: Contact StackCP support
4. **If support says no**: Use Railway/Render for backend

---

## Quick Check Commands (via SSH)

You can verify your setup via SSH:

```bash
# Check if Node.js Selector created any files
ls -la ~/public_html/api/.nodejs* ~/public_html/api/.htaccess

# Check if there's a Node.js wrapper script
find ~ -name "*nodejs*" -o -name "*node*" 2>/dev/null | grep -v node_modules

# Check environment variables (if Node.js Selector is set up)
env | grep NODE
```

---

## Need Help?

If you're stuck, let me know:
1. Do you see "Node.js Selector" in your cPanel?
2. What happens when you try to access it?
3. Did StackCP support respond? What did they say?

