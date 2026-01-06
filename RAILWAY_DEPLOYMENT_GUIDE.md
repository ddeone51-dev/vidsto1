# Railway Deployment Guide - Step by Step

This guide will help you deploy your Vidisto backend to Railway in about 10 minutes.

---

## 🚀 Step 1: Sign Up for Railway

1. **Go to**: https://railway.app
2. **Click**: "Start a New Project" or "Login"
3. **Sign up** with GitHub (recommended) or email
4. **Verify your email** if needed

**Free tier includes**: $5 credit/month (enough for testing!)

---

## 📦 Step 2: Create New Project

1. **Click**: "New Project"
2. **Select**: "Deploy from GitHub repo"
3. **Authorize Railway** to access your GitHub (if first time)
4. **Select your repository**: `vidsto1` (or whatever your repo is named)
5. **Click**: "Deploy Now"

Railway will automatically detect it's a Node.js project! ✅

---

## ⚙️ Step 3: Configure Your Service

After Railway starts deploying, you'll see your service. Click on it to configure:

### 3a. Set Root Directory (if needed)

If your backend is in a subdirectory:
- **Settings** → **Root Directory**
- Set to: `/` (root) or leave blank
- Your `package.json` should be at the root

### 3b. Set Start Command

- **Settings** → **Deploy**
- **Start Command**: `node server/index.js`
- Railway might auto-detect this, but verify it's correct

### 3c. Set Build Command (optional)

Railway will auto-run `npm install`, but you can set:
- **Build Command**: `npm install` (usually auto-detected)

---

## 🔐 Step 4: Add Environment Variables

This is the most important step! Click **Variables** tab and add these:

### Required Variables:

```
NODE_ENV=production
PORT=4000
JWT_SECRET=your-very-long-random-secret-here-minimum-32-characters
GOOGLE_API_KEY=your_google_api_key_here
CORS_ORIGIN=https://techland.co.tz,https://www.techland.co.tz
```

### Optional Variables (add if you use them):

```
IMAGE_PROVIDER=vertex
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
LEONARDO_API_KEY=your-leonardo-key-if-using-leonardo
```

### Payment Variables (if using AzamPay):

```
AZAMPAY_CLIENT_ID=your-client-id
AZAMPAY_CLIENT_SECRET=your-client-secret
AZAMPAY_APP_NAME=your-app-name
AZAMPAY_AUTHENTICATOR_URL=https://authenticator-sandbox.azampay.co.tz
AZAMPAY_CHECKOUT_URL=https://sandbox.azampay.co.tz
```

### How to Add Variables:

1. Click **Variables** tab
2. Click **+ New Variable**
3. Enter **Name** and **Value**
4. Click **Add**
5. Repeat for each variable

**Important**: 
- Railway will automatically redeploy when you add variables
- Make sure `JWT_SECRET` is long and random (use: `openssl rand -base64 32`)

---

## 📁 Step 5: Handle Service Account File (if using Vertex AI)

If you use Vertex AI and have `vertex-sa.json`:

### Option A: Convert to Environment Variable (Recommended)

1. **Read your `vertex-sa.json` file**
2. **Copy the entire JSON content**
3. **Add as environment variable**:
   - Name: `GOOGLE_APPLICATION_CREDENTIALS`
   - Value: Paste the entire JSON (Railway will handle it)

### Option B: Upload via Railway Files (if available)

Some Railway plans allow file uploads. Check if you can upload `vertex-sa.json` directly.

### Option C: Use Environment Variables Instead

Set these instead of the JSON file:
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_API_KEY=your-api-key
```

---

## 🚢 Step 6: Deploy!

Railway will automatically:
1. ✅ Install dependencies (`npm install`)
2. ✅ Start your server (`node server/index.js`)
3. ✅ Provide a URL (like `your-app.railway.app`)

**Watch the logs** to see if it starts successfully!

---

## 🔍 Step 7: Check Deployment Status

1. **Click on your service**
2. **Go to "Deployments" tab**
3. **Check the latest deployment**:
   - ✅ Green = Success
   - ❌ Red = Error (check logs)

4. **Go to "Logs" tab** to see:
   - Build output
   - Server startup messages
   - Any errors

**Look for**: `Vidisto API listening on http://localhost:4000` ✅

---

## 🌐 Step 8: Get Your Backend URL

1. **Click**: "Settings" → "Networking"
2. **Find**: "Public Domain" or "Generate Domain"
3. **Copy the URL** (e.g., `vidsto-production.up.railway.app`)

**This is your backend URL!** 🎉

---

## ✅ Step 9: Test Your Backend

Test if it's working:

1. **Visit**: `https://your-app.railway.app/api/health` (if you have a health endpoint)
2. **Or test**: `https://your-app.railway.app/api/plans` (if you have this endpoint)

You should get a JSON response! ✅

---

## 🔄 Step 10: Set Up Custom Domain (Optional)

If you want to use `api.techland.co.tz`:

1. **Railway Settings** → **Networking** → **Custom Domain**
2. **Add domain**: `api.techland.co.tz`
3. **Railway will give you DNS records** to add:
   - Usually a CNAME record
4. **Add DNS record** in your domain registrar (where you manage techland.co.tz)
5. **Wait for DNS propagation** (5-30 minutes)
6. **Railway will automatically get SSL certificate** ✅

---

## 📱 Step 11: Update Frontend

Now update your frontend to use the Railway backend:

### Option A: Use Railway Domain

```bash
cd web
VITE_API_BASE_URL=https://your-app.railway.app/api npm run build
```

### Option B: Use Custom Domain (if set up)

```bash
cd web
VITE_API_BASE_URL=https://api.techland.co.tz/api npm run build
```

Then upload the new `dist/` folder to StackCP.

---

## 🔧 Troubleshooting

### ❌ Build Fails

**Check logs** for errors:
- Missing dependencies? Check `package.json`
- Wrong Node.js version? Railway auto-detects, but you can set it in `package.json`:
  ```json
  "engines": {
    "node": "18.x"
  }
  ```

### ❌ Server Won't Start

**Check logs**:
- Missing environment variables?
- Port conflict? (Railway sets PORT automatically, don't hardcode)
- Database issues? (Check if `data/` directory is writable)

### ❌ Environment Variables Not Working

- Make sure you **saved** them (click "Add" after entering)
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables

### ❌ CORS Errors

- Make sure `CORS_ORIGIN` includes your frontend domain
- Format: `https://techland.co.tz,https://www.techland.co.tz` (comma-separated)

---

## 💰 Railway Pricing

### Free Tier:
- ✅ $5 credit/month
- ✅ Enough for testing/small apps
- ✅ Automatic deployments
- ✅ SSL included

### Paid Plans:
- **Developer**: $5/month (more resources)
- **Team**: $20/month (for teams)

**You can start free and upgrade later!** 🎉

---

## 📊 Monitoring

Railway provides:
- **Logs**: Real-time logs
- **Metrics**: CPU, Memory usage
- **Deployments**: History of all deployments

**Check regularly** to ensure your app is running smoothly!

---

## 🎯 Quick Checklist

- [ ] Railway account created
- [ ] Project created from GitHub
- [ ] Start command set: `node server/index.js`
- [ ] Environment variables added:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=4000`
  - [ ] `JWT_SECRET` (long random string)
  - [ ] `GOOGLE_API_KEY`
  - [ ] `CORS_ORIGIN`
- [ ] Deployment successful (green status)
- [ ] Backend URL obtained
- [ ] Backend tested (visit URL)
- [ ] Frontend updated with new backend URL
- [ ] Custom domain set up (optional)

---

## 🆘 Need Help?

If you get stuck:
1. **Check Railway logs** - they're very helpful!
2. **Check this guide** - make sure all steps are done
3. **Ask me** - I can help troubleshoot!

---

## 🎉 You're Done!

Your backend should now be running on Railway! 

**Next**: Update your frontend to point to the Railway backend URL, and you're live! 🚀

