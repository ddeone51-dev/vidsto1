# Clear Browser Cache - Steps

Your browser is showing the old cached version. Follow these steps:

## Quick Fix (Try This First):

1. **Hard Refresh the Browser:**
   - Press `Ctrl + Shift + R` (Windows/Linux)
   - Or `Ctrl + F5`
   - This forces the browser to reload everything

2. **Or use DevTools:**
   - Press `F12` to open DevTools
   - Right-click on the refresh button
   - Click "Empty Cache and Hard Reload"

## If That Doesn't Work:

1. **Clear Browser Cache:**
   - Chrome/Edge: Press `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Click "Clear data"

2. **Or Use Incognito/Private Mode:**
   - Open a new Incognito/Private window
   - Navigate to `http://localhost:5173`
   - This bypasses all cache

## After Clearing Cache:

1. **Restart the Dev Servers:**
   ```bash
   # Stop current servers (Ctrl+C in their terminals)
   # Then restart:
   npm run dev:server  # In one terminal
   npm run dev:web     # In another terminal
   ```

2. **Wait for servers to fully start** (you'll see "Local: http://localhost:5173")

3. **Open browser to:** `http://localhost:5173`

4. **Do a hard refresh:** `Ctrl + Shift + R`

## What I Just Did:

- Stopped all Node processes
- Cleared Vite cache (`.vite` folder)
- Cleared build cache (`dist` folder)

Now restart your servers and do a hard refresh!
















