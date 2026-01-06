# Simple Deployment: Using SSH with StackCP cPanel

If StackCP doesn't have Node.js Selector, you can use SSH access (if available) to run Node.js directly.

---

## Step 1: Check if You Have SSH Access

1. **Login to StackCP cPanel**
2. Look for these options in your cPanel:
   - **Terminal** (some cPanel versions have this)
   - **SSH Access** 
   - **Advanced → Terminal**
   - Or check your hosting plan details

3. **Alternative**: Check your StackCP welcome email - it usually mentions SSH access

**If you DON'T have SSH access**, you'll need to:
- Contact StackCP support to enable SSH access, OR
- Upgrade to a plan that includes SSH access, OR
- Use a different hosting provider

---

## Step 2: Connect via SSH (if available)

### Option A: Using cPanel Terminal (if available)

1. In cPanel, click **Terminal** (if you see it)
2. You'll be in your home directory

### Option B: Using SSH Client (Windows)

1. **Download PuTTY** (free SSH client for Windows):
   - Download from: https://www.putty.org/
   - Or use Windows Terminal/PowerShell SSH

2. **Connect to your server**:
   ```
   ssh your-username@techland.co.tz
   ```
   Or use the IP address:
   ```
   ssh your-username@your-server-ip
   ```

3. **Enter your password** (or use SSH key if configured)

---

## Step 3: Install Node.js (if not already installed)

Once connected via SSH, check if Node.js is installed:

```bash
node --version
npm --version
```

**If Node.js is NOT installed**, you can install it using Node Version Manager (nvm):

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 18
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

**Note**: Some shared hosting providers don't allow installing software. If this doesn't work, you may need to contact StackCP support.

---

## Step 4: Set Up Your Backend

1. **Navigate to your api directory**:
   ```bash
   cd ~/public_html/api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create .env file**:
   ```bash
   nano .env
   ```
   
   Add your environment variables:
   ```env
   NODE_ENV=production
   PORT=4000
   GOOGLE_API_KEY=your_google_api_key_here
   JWT_SECRET=your_random_secure_secret_here
   ```
   
   Save: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Run Node.js with PM2 (Recommended)

PM2 keeps your app running even after you disconnect.

1. **Install PM2 globally**:
   ```bash
   npm install -g pm2
   ```

2. **Start your app with PM2**:
   ```bash
   cd ~/public_html/api
   pm2 start server/index.js --name vidsto-api
   ```

3. **Save PM2 configuration** (so it starts on server reboot):
   ```bash
   pm2 save
   pm2 startup
   ```
   (Follow the instructions it gives you)

4. **Check status**:
   ```bash
   pm2 status
   pm2 logs vidsto-api
   ```

---

## Step 6: Configure Apache to Proxy API Requests

Since your backend runs on port 4000, you need to configure Apache to forward `/api` requests to your Node.js backend.

1. **Create/edit `.htaccess` in `public_html/api/`**:
   ```bash
   cd ~/public_html/api
   nano .htaccess
   ```

2. **Add this configuration**:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /api
     
     # Proxy all requests to Node.js backend
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule ^(.*)$ http://localhost:4000/api/$1 [P,L]
   </IfModule>
   ```

**OR** if your cPanel allows editing Apache config directly, you can add this to your domain's Apache configuration.

---

## Step 7: Configure Frontend

Your frontend is already uploaded to `public_html/`. You just need to make sure it's configured to use the same domain for the API.

1. **Rebuild frontend with your domain's API URL**:
   ```bash
   cd web
   VITE_API_BASE_URL=https://techland.co.tz/api npm run build
   ```

2. **Upload new dist files to public_html/**

---

## Step 8: Test

1. **Check if backend is running**:
   ```bash
   pm2 status
   curl http://localhost:4000/api/health
   ```

2. **Visit your website**: `https://techland.co.tz`
3. **Test API**: `https://techland.co.tz/api/health` (if you have a health endpoint)

---

## If SSH/Node.js Installation Doesn't Work

### Contact StackCP Support

Ask them:
1. "Do you support SSH access?"
2. "Can I install Node.js on my hosting plan?"
3. "Do you have Node.js available on your servers?"
4. "What's the best way to run a Node.js application on StackCP?"

They might:
- Enable SSH access for you
- Install Node.js for you
- Provide instructions specific to StackCP
- Suggest upgrading to a VPS plan (which definitely supports Node.js)

---

## Alternative: Use a Different Hosting Provider

If StackCP doesn't support Node.js at all, consider these **simple** alternatives:

### 1. **Render.com** (Very Simple, Free Tier)
- Free tier available
- Just connect GitHub and deploy
- No configuration needed

### 2. **DigitalOcean App Platform** (Simple, Paid)
- $5/month minimum
- Very easy to use
- Good documentation

### 3. **Heroku** (Simple but Paid)
- Free tier discontinued, but easy to use
- ~$7/month for hobby plan

---

## Summary

**Simplest Path Forward:**
1. ✅ Check if StackCP provides SSH access
2. ✅ If yes: Use SSH to install Node.js and run your backend with PM2
3. ✅ If no: Contact StackCP support OR use a simple hosting service like Render.com

**Most Important**: Check with StackCP support first - they might have a simple solution!

