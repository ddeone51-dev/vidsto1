# Railway Deployment Guide for ddeone51-dev

Personalized deployment guide for your GitHub account: **ddeone51-dev**

---

## 🚀 Quick Start Commands

### Step 1: Prepare Your Repository

**If you haven't pushed to GitHub yet:**

```bash
# Check if remote is set
git remote -v

# If no remote, add it:
git remote add origin https://github.com/ddeone51-dev/vidsto1.git

# Stage important files (NOT .env or vertex-sa.json)
git add package.json Procfile server/ src/ web/ .gitignore

# Commit
git commit -m "Prepare for Railway deployment"

# Push to GitHub
git push -u origin master
```

**If your repo has a different name**, replace `vidsto1` with your actual repo name.

---

## 🔐 Environment Variables for Railway

Copy these when setting up Railway:

### Required Variables:

```
NODE_ENV=production
PORT=4000
JWT_SECRET=<see-generated-secret-below>
GOOGLE_API_KEY=<your-actual-google-api-key>
CORS_ORIGIN=https://techland.co.tz,https://www.techland.co.tz
```

### Generated JWT_SECRET:

I'll generate one for you in the next step - use that value!

---

## 📋 Step-by-Step Railway Deployment

### 1. Sign Up for Railway
- Go to: https://railway.app
- Click: "Login with GitHub"
- Authorize Railway to access your GitHub account

### 2. Create New Project
- Click: "New Project"
- Select: "Deploy from GitHub repo"
- Find and select: `ddeone51-dev/vidsto1` (or your repo name)
- Click: "Deploy Now"

### 3. Add Environment Variables
- Click on your service → "Variables" tab
- Add each variable from the list above
- Use the generated JWT_SECRET I'll provide

### 4. Get Your Backend URL
- Settings → Networking → Generate Domain
- Copy the URL (e.g., `vidsto-production.up.railway.app`)

### 5. Test Your Backend
- Visit: `https://your-url.railway.app/api/plans`
- Should return JSON ✅

---

## 🎯 Your Repository Info

- **GitHub Username**: ddeone51-dev
- **Repository URL**: https://github.com/ddeone51-dev/vidsto1 (or your repo name)
- **Railway will connect to**: Your GitHub account

---

## ✅ Pre-Deployment Checklist

Before deploying, make sure:

- [ ] Code is committed to git
- [ ] `.env` file is NOT committed (it's in .gitignore ✅)
- [ ] `vertex-sa.json` is NOT committed (now in .gitignore ✅)
- [ ] `package.json` has `"start": "node server/index.js"` ✅
- [ ] `Procfile` exists ✅
- [ ] You have your `GOOGLE_API_KEY` ready

---

## 🆘 Troubleshooting

**If Railway can't find your repo:**
- Make sure you authorized Railway to access your GitHub
- Check the repo name matches exactly
- Try refreshing the repo list in Railway

**If deployment fails:**
- Check Railway logs for errors
- Make sure all environment variables are set
- Verify `package.json` is correct

---

## 📞 Need Help?

Tell me:
1. Which step are you on?
2. What error are you seeing?
3. What does Railway logs show?

I'll help you troubleshoot! 🚀

