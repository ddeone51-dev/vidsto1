# Deploy to Railway - Step by Step Guide

Follow these steps exactly to deploy your app to Railway.

---

## ⚠️ Important: Before You Start

**I cannot access your GitHub or Railway accounts directly**, but I'll guide you through every step!

---

## 📋 Step 1: Prepare Your Repository

### 1a. Make Sure Sensitive Files Are Ignored

Your `.gitignore` should exclude:
- ✅ `.env` (environment variables)
- ✅ `vertex-sa.json` (service account file)
- ✅ `data/` (database files)
- ✅ `node_modules/` (dependencies)

**Check**: Your `.gitignore` already has these! ✅

### 1b. Commit Important Files (if not already committed)

Make sure these are committed to git:
- ✅ `package.json`
- ✅ `server/` directory
- ✅ `src/` directory
- ✅ `Procfile`

**DO NOT commit:**
- ❌ `.env`
- ❌ `vertex-sa.json`
- ❌ `data/` folder

---

## 🔗 Step 2: Push to GitHub

### If you don't have a GitHub repository yet:

1. **Go to**: https://github.com/new
2. **Repository name**: `vidsto1` (or your preferred name)
3. **Make it**: Public or Private (your choice)
4. **Don't** initialize with README (you already have files)
5. **Click**: "Create repository"

### Push your code:

```bash
# If you haven't set up git remote yet:
git remote add origin https://github.com/YOUR_USERNAME/vidsto1.git

# Stage important files (but NOT .env or vertex-sa.json)
git add package.json Procfile server/ src/ web/ .gitignore

# Commit
git commit -m "Prepare for Railway deployment"

# Push to GitHub
git push -u origin master
```

**Replace `YOUR_USERNAME` with your actual GitHub username!**

---

## 🚂 Step 3: Sign Up for Railway

1. **Go to**: https://railway.app
2. **Click**: "Start a New Project" or "Login"
3. **Choose**: "Login with GitHub" (recommended - easiest!)
4. **Authorize Railway** to access your GitHub account
5. **Complete signup** if needed

---

## 🚀 Step 4: Deploy Your App

1. **In Railway dashboard**, click: **"New Project"**
2. **Select**: **"Deploy from GitHub repo"**
3. **If first time**: Authorize Railway to access your GitHub repos
4. **Select your repository**: `vidsto1` (or whatever you named it)
5. **Click**: **"Deploy Now"**

Railway will automatically:
- ✅ Detect it's a Node.js project
- ✅ Run `npm install`
- ✅ Start your server using `Procfile` or `package.json` start script

**Watch the deployment logs!** You'll see it building.

---

## ⚙️ Step 5: Configure Environment Variables

**This is CRITICAL!** While Railway is deploying, add these variables:

### Click on your service → "Variables" tab

Add these **Required** variables:

```
NODE_ENV=production
PORT=4000
JWT_SECRET=<generate-a-random-32-character-string>
GOOGLE_API_KEY=<your-actual-google-api-key>
CORS_ORIGIN=https://techland.co.tz,https://www.techland.co.tz
```

### How to Generate JWT_SECRET:

**Option A: PowerShell (Windows)**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Option B: Online Generator**
- Go to: https://randomkeygen.com/
- Use a "CodeIgniter Encryption Keys" (64 characters)
- Or use the first 32 characters of any long random string

**Option C: Use this (copy and use):**
```
JWT_SECRET=your-super-secret-key-change-this-to-something-random-12345
```
(But make it longer and more random!)

### Add Optional Variables (if you use them):

```
IMAGE_PROVIDER=vertex
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
LEONARDO_API_KEY=your-leonardo-key
```

### Add Payment Variables (if using AzamPay):

```
AZAMPAY_CLIENT_ID=your-client-id
AZAMPAY_CLIENT_SECRET=your-client-secret
AZAMPAY_APP_NAME=your-app-name
AZAMPAY_AUTHENTICATOR_URL=https://authenticator-sandbox.azampay.co.tz
AZAMPAY_CHECKOUT_URL=https://sandbox.azampay.co.tz
```

### How to Add Each Variable:

1. Click **"+ New Variable"**
2. **Name**: Enter the variable name (e.g., `NODE_ENV`)
3. **Value**: Enter the value (e.g., `production`)
4. Click **"Add"**
5. Repeat for each variable

**Important**: Railway will automatically redeploy when you add variables!

---

## 📁 Step 6: Handle Service Account File (if using Vertex AI)

If you use Vertex AI and have `vertex-sa.json`:

### Option A: Convert to Environment Variable (Recommended)

1. **Open** your `vertex-sa.json` file locally
2. **Copy the entire JSON content**
3. **In Railway**, add variable:
   - **Name**: `GOOGLE_APPLICATION_CREDENTIALS`
   - **Value**: Paste the entire JSON (Railway handles it)

### Option B: Use Environment Variables Instead

Set these instead:
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_API_KEY=your-api-key
```

---

## 🔍 Step 7: Check Deployment Status

1. **Click on your service** in Railway
2. **Go to "Deployments" tab**
3. **Check the latest deployment**:
   - ✅ **Green checkmark** = Success!
   - ❌ **Red X** = Error (check logs)

4. **Go to "Logs" tab** and look for:
   ```
   Vidisto API listening on http://localhost:4000
   ```

If you see this, your server is running! ✅

---

## 🌐 Step 8: Get Your Backend URL

1. **Click**: **Settings** → **Networking**
2. **Find**: **"Public Domain"** section
3. **Click**: **"Generate Domain"** (if not already generated)
4. **Copy the URL** (e.g., `vidsto-production.up.railway.app`)

**This is your backend URL!** 🎉

---

## 🧪 Step 9: Test Your Backend

Test if it's working:

1. **Visit**: `https://your-url.railway.app/api/plans`
   - Should return JSON with plans

2. **Or test**: `https://your-url.railway.app/api/health`
   - If you have a health endpoint

**If you get JSON back, it's working!** ✅

---

## 🔧 Step 10: Troubleshooting

### ❌ Build Fails

**Check logs** for errors:
- Missing dependencies? Check `package.json`
- Wrong Node.js version? Railway auto-detects, but you can specify in `package.json`:
  ```json
  "engines": {
    "node": "18.x"
  }
  ```

### ❌ Server Won't Start

**Check logs**:
- Missing environment variables? Make sure all required vars are set
- Port conflict? Railway sets PORT automatically, don't hardcode
- Database issues? Check if `data/` directory permissions are OK

### ❌ Environment Variables Not Working

- Make sure you **saved** them (click "Add" after entering)
- Check variable names match exactly (case-sensitive!)
- Redeploy after adding variables

### ❌ CORS Errors

- Make sure `CORS_ORIGIN` includes your frontend domain
- Format: `https://techland.co.tz,https://www.techland.co.tz` (comma-separated)

---

## 📱 Step 11: Update Frontend

Now update your frontend to use the Railway backend:

### Option A: Use Railway Domain

```bash
cd web
VITE_API_BASE_URL=https://your-app.railway.app/api npm run build
```

### Option B: Use Custom Domain (if you set one up)

```bash
cd web
VITE_API_BASE_URL=https://api.techland.co.tz/api npm run build
```

Then upload the new `dist/` folder contents to StackCP.

---

## 🌍 Step 12: Set Up Custom Domain (Optional)

If you want to use `api.techland.co.tz`:

1. **Railway Settings** → **Networking** → **Custom Domain**
2. **Add domain**: `api.techland.co.tz`
3. **Railway will show DNS records** to add:
   - Usually a **CNAME** record
4. **Add DNS record** in your domain registrar:
   - **Type**: CNAME
   - **Name**: `api`
   - **Value**: Railway's provided domain
5. **Wait for DNS propagation** (5-30 minutes)
6. **Railway will automatically get SSL certificate** ✅

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] Project created and connected to GitHub repo
- [ ] Deployment started
- [ ] Environment variables added:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=4000`
  - [ ] `JWT_SECRET` (random string)
  - [ ] `GOOGLE_API_KEY`
  - [ ] `CORS_ORIGIN`
- [ ] Deployment successful (green checkmark)
- [ ] Backend URL obtained
- [ ] Backend tested (visit URL)
- [ ] Frontend updated with new backend URL
- [ ] Custom domain set up (optional)

---

## 🎉 You're Done!

Your backend should now be running on Railway! 

**Next**: Update your frontend to point to the Railway backend URL, and you're live! 🚀

---

## 🆘 Need Help?

If you get stuck at any step:
1. **Check Railway logs** - they're very helpful!
2. **Tell me which step** you're on and what error you see
3. **I'll help troubleshoot!**

---

## 💡 Pro Tips

1. **Railway auto-deploys** on every git push! 🎉
   - Just push to GitHub, Railway deploys automatically

2. **Free tier** gives $5/month credit (enough for testing!)

3. **Logs are real-time** - great for debugging

4. **Environment variables** trigger auto-redeploy

5. **Railway provides HTTPS** automatically - no SSL setup needed!

---

**Ready to start?** Go to https://railway.app and follow the steps above! 🚀

