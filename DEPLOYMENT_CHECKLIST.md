# Deployment Checklist

Use this checklist to ensure everything is ready for deployment.

## Pre-Deployment

- [ ] Code is committed to Git
- [ ] All tests pass (if any)
- [ ] Environment variables documented
- [ ] Database backup strategy planned
- [ ] File storage solution decided

## Environment Variables

### Backend (Railway/Render)
- [ ] `GOOGLE_API_KEY` - Your Google API key
- [ ] `NODE_ENV=production`
- [ ] `PORT=4000` (or platform default)

### Frontend (Vercel/Render)
- [ ] `VITE_API_BASE_URL` - Full backend URL (e.g., `https://api.yourdomain.com/api`)

## Code Preparation

- [ ] `Procfile` created (for Railway)
- [ ] `railway.json` created (optional, for Railway)
- [ ] `vercel.json` created (for Vercel frontend)
- [ ] `.railwayignore` created (excludes unnecessary files)
- [ ] API client uses environment variables correctly

## Deployment Steps

### Backend
- [ ] Repository pushed to GitHub
- [ ] Railway/Render project created
- [ ] Environment variables set
- [ ] Service deployed successfully
- [ ] Backend URL obtained
- [ ] Backend tested (health check)

### Frontend
- [ ] Vercel/Render project created
- [ ] Root directory set to `web`
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variables set
- [ ] Frontend deployed successfully
- [ ] Frontend URL obtained

## Testing

- [ ] Frontend loads correctly
- [ ] Can register new user
- [ ] Can login
- [ ] Can generate video
- [ ] Can view library
- [ ] Can download videos
- [ ] Featured videos display
- [ ] All pages load (About, Contact, FAQ, etc.)

## Domain Setup (Optional)

- [ ] Domain purchased
- [ ] Backend domain configured (CNAME)
- [ ] Frontend domain configured (A/CNAME)
- [ ] SSL certificates active (automatic on most platforms)
- [ ] DNS propagation complete
- [ ] CORS updated for custom domain

## Post-Deployment

- [ ] Monitoring set up
- [ ] Error tracking configured (optional)
- [ ] Backups configured
- [ ] Documentation updated with live URLs
- [ ] Team notified of deployment

## Security

- [ ] HTTPS enabled (automatic on most platforms)
- [ ] Environment variables secured
- [ ] CORS properly configured
- [ ] Rate limiting considered (if needed)
- [ ] API keys not exposed in code

## Performance

- [ ] CDN enabled (automatic on Vercel)
- [ ] Images optimized
- [ ] Caching headers set
- [ ] Database queries optimized
- [ ] File storage optimized

---

## Quick Reference

### Backend URL Format
```
https://your-app-name.railway.app
or
https://api.yourdomain.com
```

### Frontend URL Format
```
https://your-app-name.vercel.app
or
https://www.yourdomain.com
```

### API Base URL for Frontend
```
https://your-backend-url.railway.app/api
or
https://api.yourdomain.com/api
```

---

## Support Resources

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs


