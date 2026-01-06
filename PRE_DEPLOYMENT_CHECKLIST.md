# Pre-Deployment Checklist - Before Deploying to Railway

Check these items before deploying to Railway.

---

## ✅ Repository Preparation

### 1. Sensitive Files Excluded

Make sure these are in `.gitignore` and NOT committed:
- [ ] `.env` file
- [ ] `vertex-sa.json` file
- [ ] `data/` directory (database files)
- [ ] `node_modules/` directories

**Status**: ✅ Your `.gitignore` is updated!

### 2. Important Files Committed

Make sure these ARE committed to git:
- [ ] `package.json`
- [ ] `Procfile`
- [ ] `server/` directory
- [ ] `src/` directory
- [ ] `.gitignore`

**Status**: Check with `git status`

### 3. GitHub Repository Ready

- [ ] Repository exists on GitHub
- [ ] Code is pushed to GitHub
- [ ] Repository is accessible

---

## 🔐 Environment Variables Ready

Have these values ready before deploying:

### Required:
- [ ] `GOOGLE_API_KEY` - Your Google API key
- [ ] `JWT_SECRET` - Random 32+ character string (generate this!)

### Optional (if you use them):
- [ ] `GOOGLE_CLOUD_PROJECT_ID`
- [ ] `GOOGLE_CLOUD_LOCATION`
- [ ] `IMAGE_PROVIDER`
- [ ] `LEONARDO_API_KEY`
- [ ] AzamPay credentials (if using payments)

---

## 🚀 Ready to Deploy?

Once all items above are checked, you're ready to deploy!

**Next**: Follow `DEPLOY_TO_RAILWAY_STEP_BY_STEP.md`

---

## 🆘 Need Help?

If you're missing any of these, let me know and I'll help you prepare!

