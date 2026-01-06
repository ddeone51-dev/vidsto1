# How to Restart Your Servers

## Quick Steps

### 1. Stop the Current Server
- Go to the terminal/command prompt where your backend server is running
- Press **`Ctrl+C`** (or **`Ctrl+Break`** on some keyboards)
- Wait until you see the prompt again (the server has stopped)

### 2. Restart Backend Server
In the same terminal, run:
```powershell
cd c:\vidsto
$env:GOOGLE_API_KEY = "AIzaSyCTySJHkjtaCdJ_WgjeL8TYqNfrO6swChs"
npm run dev:server
```

You should see:
```
Vidisto API listening on http://localhost:4000
```

### 3. Restart Frontend Server (if needed)
If you also need to restart the frontend:
- Go to the terminal running the frontend
- Press **`Ctrl+C`** to stop it
- Then run:
```powershell
cd c:\vidsto\web
npm run dev
```

## Visual Guide

**Terminal 1 - Backend:**
```
C:\vidsto> npm run dev:server
Vidisto API listening on http://localhost:4000
^C  ← Press Ctrl+C here to stop
C:\vidsto> npm run dev:server  ← Run again to restart
```

**Terminal 2 - Frontend (if needed):**
```
C:\vidsto\web> npm run dev
VITE v7.2.2  ready...
^C  ← Press Ctrl+C here to stop
C:\vidsto\web> npm run dev  ← Run again to restart
```

## Troubleshooting

### If Ctrl+C doesn't work:
- Try **`Ctrl+Break`**
- Or close the terminal window and open a new one
- Then run the start commands again

### If you see "port already in use":
- The old server might still be running
- Close all terminal windows
- Open new terminals and try again
- Or restart your computer if needed

### To verify server is running:
- Backend: Open http://localhost:4000/api/health in your browser
- Frontend: Open http://localhost:5173 in your browser


























