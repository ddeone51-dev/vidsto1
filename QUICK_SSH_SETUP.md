# Quick SSH Setup Guide - StackCP

Follow these steps in order to get your backend running via SSH.

---

## Step 1: Connect to SSH

### Option A: Use cPanel Terminal (Easiest)

1. In your cPanel, click **"Terminal"** or **"SSH Access"**
2. You should see a command prompt
3. You're ready! ✅

### Option B: Use Windows SSH (if cPanel Terminal doesn't work)

1. Open **PowerShell** on Windows
2. Type:
   ```bash
   ssh your-username@techland.co.tz
   ```
   (Replace `your-username` with your cPanel username)
3. Enter your password when prompted

---

## Step 2: Check Node.js

Type these commands to check if Node.js is installed:

```bash
node --version
npm --version
```

**If you see version numbers** (like `v18.17.0`), Node.js is installed! ✅ Skip to Step 3.

**If you see "command not found"**, install Node.js using nvm (Step 2b).

### Step 2b: Install Node.js (if needed)

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload your shell configuration
source ~/.bashrc

# Install Node.js 18
nvm install 18
nvm use 18

# Verify installation
node --version
npm --version
```

**If nvm installation fails**, contact StackCP support - they might need to install Node.js for you.

---

## Step 3: Go to Your API Directory

```bash
cd ~/public_html/api
```

Verify you're in the right place:
```bash
ls
```

You should see: `server/`, `src/`, `package.json`

---

## Step 4: Install Dependencies

```bash
npm install
```

This will take 2-5 minutes. Wait for it to finish.

---

## Step 5: Create .env File

```bash
nano .env
```

**Copy and paste this** (replace with your actual values):

```env
NODE_ENV=production
PORT=4000
GOOGLE_API_KEY=your_google_api_key_here
JWT_SECRET=change_this_to_a_random_long_string_at_least_32_characters
CORS_ORIGIN=https://techland.co.tz,https://www.techland.co.tz
```

**Important:**
- Replace `your_google_api_key_here` with your actual Google API key
- Replace `change_this_to_a_random_long_string...` with a random secret (you can use: `openssl rand -base64 32` to generate one)

**To save in nano:**
- Press `Ctrl+X`
- Press `Y` (yes)
- Press `Enter`

---

## Step 6: Generate JWT Secret (Optional but Recommended)

If you want to generate a secure random secret:

```bash
openssl rand -base64 32
```

Copy the output and use it as your `JWT_SECRET` in the .env file.

---

## Step 7: Test the Server (Quick Test)

Let's make sure everything works:

```bash
node server/index.js
```

You should see:
```
Vidisto API listening on http://localhost:4000
```

**If you see errors**, check:
- Is your GOOGLE_API_KEY correct?
- Did npm install complete successfully?

**To stop the server**: Press `Ctrl+C`

---

## Step 8: Install PM2 (Keeps Server Running)

PM2 will keep your server running even after you disconnect:

```bash
# Install PM2 globally
npm install -g pm2

# Start your server with PM2
pm2 start server/index.js --name vidsto-api

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs vidsto-api
```

Your server should now be running! ✅

---

## Step 9: Configure Apache to Proxy API Requests

Your backend runs on port 4000, but we need Apache to forward `/api` requests to it.

**Option 1: Using .htaccess (Simpler)**

Create/edit `.htaccess` in `public_html/api/`:

```bash
cd ~/public_html/api
nano .htaccess
```

Add this:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /api
  
  # Proxy all API requests to Node.js backend
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^(.*)$ http://localhost:4000/api/$1 [P,L]
</IfModule>
```

Save: `Ctrl+X`, `Y`, `Enter`

**Note**: This requires `mod_proxy` and `mod_rewrite` to be enabled. If it doesn't work, contact StackCP support to enable these modules.

**Option 2: Contact StackCP Support**

Ask them to configure Apache to proxy `/api` requests to `localhost:4000`. They can do this in the Apache configuration.

---

## Step 10: Configure Frontend

Your frontend needs to know the API URL. Rebuild it on your local machine:

```bash
cd web
VITE_API_BASE_URL=https://techland.co.tz/api npm run build
```

Then upload the new `dist/` contents to `public_html/` via cPanel File Manager.

---

## Step 11: Test Everything

1. **Check if backend is running**:
   ```bash
   pm2 status
   ```

2. **Visit your website**: `https://techland.co.tz`

3. **Test API endpoint**: `https://techland.co.tz/api/health` (if you have a health endpoint)

---

## Useful PM2 Commands

```bash
# View logs
pm2 logs vidsto-api

# Restart server
pm2 restart vidsto-api

# Stop server
pm2 stop vidsto-api

# Start server
pm2 start vidsto-api

# View status
pm2 status

# View detailed info
pm2 info vidsto-api
```

---

## Troubleshooting

### Node.js installation fails
- Contact StackCP support - they might need to install it for you

### npm install fails
- Check if you're in the right directory (`~/public_html/api`)
- Check disk space: `df -h`
- Try: `npm install --verbose` to see detailed errors

### Server won't start
- Check logs: `pm2 logs vidsto-api`
- Verify .env file has correct values
- Check if port 4000 is already in use

### Apache proxy doesn't work
- Contact StackCP support to enable `mod_proxy` and `mod_rewrite`
- Or ask them to configure the proxy for you

### Can't connect to API from frontend
- Verify CORS_ORIGIN includes your domain
- Check PM2 status - is server running?
- Check Apache/htaccess configuration

---

## Need Help?

If you get stuck at any step, note:
1. What command you ran
2. What error message you saw
3. What step you're on

And we can troubleshoot together!

