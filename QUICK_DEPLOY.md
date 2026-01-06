# Quick Deployment Guide - Vidisto

## Fastest Way to Deploy (Railway + Vercel)

### Prerequisites
- GitHub account
- Google API Key
- 15-20 minutes

---

## Step 1: Push Code to GitHub

```bash
# If not already a git repo
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/vidsto.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend (Railway) - 5 minutes

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `vidsto` repository
4. Railway auto-detects Node.js
5. Go to **Variables** tab, add:
   ```
   GOOGLE_API_KEY=your_actual_google_api_key
   NODE_ENV=production
   PORT=4000
   ```
6. Railway will auto-deploy (takes 2-3 minutes)
7. Copy your Railway URL (e.g., `vidsto-production.up.railway.app`)

---

## Step 3: Deploy Frontend (Vercel) - 5 minutes

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"Add New Project"**
3. Import your `vidsto` repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `web`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
5. Add Environment Variable:
   ```
   VITE_API_BASE_URL=https://your-railway-url.railway.app/api
   ```
   (Replace with your actual Railway URL from Step 2)
6. Click **Deploy**

---

## Step 4: Test Your Deployment

1. Visit your Vercel URL (e.g., `vidsto.vercel.app`)
2. Try:
   - [ ] Sign up / Login
   - [ ] Generate a video
   - [ ] View library
   - [ ] Check featured videos

---

## Step 5: Add Custom Domain (Optional)

### Backend Domain (Railway)
1. Railway project → Settings → Domains
2. Click **"Generate Domain"** or **"Add Custom Domain"**
3. For custom: Add CNAME record in your DNS:
   ```
   api.yourdomain.com → your-railway-url.railway.app
   ```

### Frontend Domain (Vercel)
1. Vercel project → Settings → Domains
2. Add your domain
3. Follow DNS instructions (usually A record or CNAME)

### Update Environment Variables
- **Vercel**: Update `VITE_API_BASE_URL` to `https://api.yourdomain.com/api`
- **Railway**: Update CORS in `server/app.js` to allow your frontend domain

---

## Important Notes

### File Storage
- Current setup uses local files (`temp/`, `uploads/`)
- **For production**, consider:
  - Railway Volumes (persistent storage)
  - AWS S3
  - Cloudinary

### Database
- Currently using SQLite (file-based)
- **For production**, consider:
  - Railway PostgreSQL (add as service)
  - Supabase (free PostgreSQL)
  - Render PostgreSQL

### Environment Variables Checklist

**Backend (Railway):**
- ✅ `GOOGLE_API_KEY` (Required)
- ✅ `NODE_ENV=production`
- ✅ `PORT=4000`

**Frontend (Vercel):**
- ✅ `VITE_API_BASE_URL` (Your Railway backend URL + `/api`)

---

## Troubleshooting

### Backend not responding?
- Check Railway logs
- Verify `GOOGLE_API_KEY` is set
- Check PORT is 4000

### Frontend can't connect to backend?
- Verify `VITE_API_BASE_URL` in Vercel
- Check CORS settings in backend
- Ensure backend URL includes `/api` at the end

### Video generation fails?
- Check Google API key is valid
- Verify API quotas/limits
- Check Railway logs for errors

---

## Cost

**Free Tier:**
- Railway: $5/month free credit (usually enough)
- Vercel: Free tier (generous limits)
- **Total: $0/month** (if within free tiers)

**If you exceed free tiers:**
- Railway: Pay-as-you-go (~$5-20/month)
- Vercel: Still free for most use cases

---

## Next Steps After Deployment

1. ✅ Test all features
2. ✅ Set up monitoring (Railway/Vercel have built-in)
3. ✅ Configure backups (if using PostgreSQL)
4. ✅ Set up custom domain
5. ✅ Enable error tracking (optional: Sentry)

---

## Need Help?

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Review Railway/Vercel documentation
3. Check application logs in hosting dashboards

**You're all set! 🚀**


