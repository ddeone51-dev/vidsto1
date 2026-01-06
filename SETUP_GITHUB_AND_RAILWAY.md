# Setup Commands for ddeone51-dev

## Step 1: Set Up GitHub Remote

**After creating your GitHub repository**, run these commands:

```bash
# Add GitHub remote
git remote add origin https://github.com/ddeone51-dev/vidsto1.git

# Check what will be committed (make sure .env and vertex-sa.json are NOT listed)
git status

# Stage important files
git add package.json Procfile server/ src/ web/ .gitignore

# Commit
git commit -m "Prepare for Railway deployment"

# Push to GitHub
git push -u origin master
```

**Note**: Replace `vidsto1` with your actual repository name if different.

---

## Step 2: Railway Environment Variables

When setting up Railway, use these exact values:

### Required Variables:

```
NODE_ENV=production
PORT=4000
JWT_SECRET=yxO02tVgQo/WvvCqhzKYGsOKPxktfvPr2mSd4mHOP04=
GOOGLE_API_KEY=<paste-your-actual-google-api-key-here>
CORS_ORIGIN=https://techland.co.tz,https://www.techland.co.tz
```

### Optional (if you use Vertex AI):

```
IMAGE_PROVIDER=vertex
GOOGLE_CLOUD_PROJECT_ID=<your-project-id>
GOOGLE_CLOUD_LOCATION=us-central1
```

### Optional (if you use AzamPay):

```
AZAMPAY_CLIENT_ID=<your-client-id>
AZAMPAY_CLIENT_SECRET=<your-client-secret>
AZAMPAY_APP_NAME=<your-app-name>
AZAMPAY_AUTHENTICATOR_URL=https://authenticator-sandbox.azampay.co.tz
AZAMPAY_CHECKOUT_URL=https://sandbox.azampay.co.tz
```

---

## Step 3: Railway Deployment Steps

1. **Go to**: https://railway.app
2. **Sign up** with GitHub (use your account: ddeone51-dev)
3. **New Project** → **Deploy from GitHub repo**
4. **Select**: `ddeone51-dev/vidsto1` (or your repo name)
5. **Deploy Now**
6. **Add Variables** (use the values above)
7. **Get your URL** from Settings → Networking

---

## Quick Reference

- **GitHub Username**: ddeone51-dev
- **Repository**: https://github.com/ddeone51-dev/vidsto1
- **JWT_SECRET**: `yxO02tVgQo/WvvCqhzKYGsOKPxktfvPr2mSd4mHOP04=`

---

## Need Help?

Tell me which step you're on and I'll help! 🚀

