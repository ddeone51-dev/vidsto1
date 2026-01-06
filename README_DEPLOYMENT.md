# 🚀 Vidisto Deployment - Quick Start

## Two Deployment Guides Available

1. **QUICK_DEPLOY.md** - Fast 15-minute deployment (Railway + Vercel)
2. **DEPLOYMENT_GUIDE.md** - Comprehensive guide with all options

---

## Recommended: Railway + Vercel (Easiest)

### Why This Combo?
- ✅ **Railway**: Best for Node.js backends, easy setup
- ✅ **Vercel**: Best for React/Vite frontends, excellent performance
- ✅ Both have free tiers
- ✅ Automatic SSL/HTTPS
- ✅ Easy GitHub integration

### Time Required: 15-20 minutes

---

## Step-by-Step (Simplified)

### 1. Push to GitHub (2 min)
```bash
git add .
git commit -m "Ready for deployment"
git push
```

### 2. Deploy Backend on Railway (5 min)
1. Go to railway.app → Sign up
2. New Project → Deploy from GitHub
3. Select your repo
4. Add environment variable: `GOOGLE_API_KEY=your_key`
5. Deploy!

### 3. Deploy Frontend on Vercel (5 min)
1. Go to vercel.com → Sign up
2. Add New Project → Import repo
3. Set Root Directory: `web`
4. Add env var: `VITE_API_BASE_URL=https://your-railway-url.railway.app/api`
5. Deploy!

### 4. Test (3 min)
- Visit your Vercel URL
- Try signing up and generating a video

---

## Environment Variables

### Backend (Railway)
```
GOOGLE_API_KEY=your_google_api_key_here
NODE_ENV=production
```

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://your-railway-backend.railway.app/api
```

---

## Custom Domain (Optional)

After basic deployment works:

1. **Backend**: Railway → Settings → Domains → Add domain
2. **Frontend**: Vercel → Settings → Domains → Add domain
3. Update DNS records as instructed
4. Update `VITE_API_BASE_URL` to use your custom domain

---

## Need More Details?

See **DEPLOYMENT_GUIDE.md** for:
- Alternative hosting options
- Database setup (PostgreSQL)
- File storage solutions
- Advanced configuration
- Troubleshooting

---

## Cost

**Free Tier:**
- Railway: $5/month credit (usually enough)
- Vercel: Free (generous limits)
- **Total: $0/month** for most use cases

---

## Support

If you get stuck:
1. Check the detailed **DEPLOYMENT_GUIDE.md**
2. Review hosting platform logs
3. Verify environment variables are set correctly
4. Test API endpoints directly

**Good luck! 🎉**


