# Railway Quick Start - 5 Minute Setup

Follow these steps to deploy your backend to Railway RIGHT NOW! 🚀

---

## ✅ Pre-Flight Check

Your project is already configured! ✅
- ✅ `package.json` has `"start": "node server/index.js"` 
- ✅ `Procfile` exists with correct command
- ✅ `.gitignore` excludes sensitive files

---

## 🚀 Deploy in 5 Steps

### Step 1: Sign Up (1 minute)
1. Go to: **https://railway.app**
2. Click: **"Start a New Project"**
3. Sign up with **GitHub** (easiest!)
4. Authorize Railway to access your repos

### Step 2: Deploy (1 minute)
1. Click: **"New Project"**
2. Select: **"Deploy from GitHub repo"**
3. Choose your repository: **`vidsto1`**
4. Click: **"Deploy Now"**

Railway will start deploying automatically! ⚡

### Step 3: Add Environment Variables (2 minutes)

While it's deploying, click **Variables** tab and add:

**Required:**
```
NODE_ENV=production
PORT=4000
JWT_SECRET=<generate-random-32-chars>
GOOGLE_API_KEY=<your-google-api-key>
CORS_ORIGIN=https://techland.co.tz,https://www.techland.co.tz
```

**To generate JWT_SECRET**, run this locally:
```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Or use an online generator: https://randomkeygen.com/

**Add each variable:**
1. Click **+ New Variable**
2. Enter Name and Value
3. Click **Add**
4. Repeat for each variable

### Step 4: Wait for Deployment (1 minute)

Watch the **Logs** tab:
- ✅ Look for: `Vidisto API listening on http://localhost:4000`
- ✅ Green checkmark = Success!

### Step 5: Get Your URL

1. Click **Settings** → **Networking**
2. Click **Generate Domain** (if not auto-generated)
3. **Copy the URL** (e.g., `vidsto-production.up.railway.app`)

**That's your backend URL!** 🎉

---

## 🧪 Test It

Visit: `https://your-url.railway.app/api/plans`

You should see JSON response! ✅

---

## 📝 Next Steps

1. **Update Frontend**:
   ```bash
   cd web
   VITE_API_BASE_URL=https://your-url.railway.app/api npm run build
   ```
   Then upload `dist/` to StackCP

2. **Set Custom Domain** (optional):
   - Railway Settings → Networking → Custom Domain
   - Add: `api.techland.co.tz`
   - Add DNS CNAME record Railway provides

---

## 🆘 Troubleshooting

**Build fails?**
- Check logs for errors
- Make sure all dependencies are in `package.json`

**Server won't start?**
- Check environment variables are set
- Check logs for error messages

**CORS errors?**
- Make sure `CORS_ORIGIN` includes your frontend domain

---

## 💡 Pro Tips

1. **Railway auto-deploys** on every git push! 🎉
2. **Free tier** gives $5/month credit (enough to test!)
3. **Logs are real-time** - great for debugging
4. **Environment variables** trigger auto-redeploy

---

## 🎯 You're Ready!

Go to **https://railway.app** and start deploying! 

Need help? Check `RAILWAY_DEPLOYMENT_GUIDE.md` for detailed instructions.

