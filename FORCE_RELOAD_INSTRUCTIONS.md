# Force Reload Instructions

## The Problem
Files are rebuilt correctly, but browser shows old version.

## Solution Steps (Do These in Order):

### Step 1: Stop ALL Servers
```bash
# Press Ctrl+C in ALL terminal windows
# OR kill all Node processes in Task Manager
```

### Step 2: Clear ALL Caches
```bash
cd C:\vidsto\web
rm -rf node_modules/.vite
rm -rf dist
rm -rf .vite
```

### Step 3: Restart Backend Server
```bash
cd C:\vidsto
npm run dev:server
```
Wait until you see: "Vidisto API listening on http://localhost:4000"

### Step 4: Restart Frontend Server (NEW TERMINAL)
```bash
cd C:\vidsto\web
npm run dev -- --force
```
Wait until you see: "Local: http://localhost:5173"

### Step 5: Browser Actions
1. **Close ALL browser windows completely**
2. **Open a NEW Incognito/Private window** (Ctrl+Shift+N)
3. **Go to:** http://localhost:5173
4. **Open DevTools** (F12)
5. **Go to Network tab**
6. **Check "Disable cache" checkbox**
7. **Reload page** (F5)

### Step 6: Verify
You should see:
- Navigation menu at top (Home, Featured Videos, Library, Plans)
- Login/Sign Up buttons if not logged in
- All pages working

## If Still Not Working:

### Check Browser Console (F12)
Look for:
- Import errors
- Module not found errors
- Any red errors

### Check Network Tab
- Look for `App.tsx` or `App.js`
- Check file size (should be ~39KB for App.tsx)
- Check if it's loading from cache

### Verify Files Are Correct
```bash
# Check file sizes
cd C:\vidsto
Get-Item web\src\App.tsx | Select Length
Get-Item server\app.js | Select Length
```

Expected:
- App.tsx: ~39,629 bytes
- app.js: ~18,256 bytes

## Alternative: Use Different Port
If port 5173 is cached, try:
```bash
cd C:\vidsto\web
npm run dev -- --port 5174
```
Then go to: http://localhost:5174
















