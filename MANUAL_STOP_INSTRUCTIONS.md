# How to Stop the Server Manually

## Method 1: Use the Stop Script (Easiest)

Just run this in PowerShell:
```powershell
.\stop-server.ps1
```

Then start the server:
```powershell
npm run dev:server
```

---

## Method 2: Manual Steps

### Step 1: Find what's using port 4000
```powershell
netstat -ano | findstr :4000
```

Look for lines that say `LISTENING` and note the PID (Process ID) number at the end.

### Step 2: Kill the process
Replace `XXXX` with the actual PID number you found:
```powershell
taskkill /PID XXXX /F
```

### Step 3: Kill ALL Node.js processes (if above doesn't work)
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 4: Verify port is free
```powershell
netstat -ano | findstr :4000
```

If you see nothing (or only `TIME_WAIT` entries), the port is free.

### Step 5: Start the server
```powershell
npm run dev:server
```

---

## Method 3: Use Task Manager

1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Go to the "Details" tab
3. Find `node.exe` processes
4. Right-click and select "End Task" or "End Process Tree"
5. Start the server again

---

## Troubleshooting

If port 4000 is STILL in use after killing processes:

1. **Check if Cursor/VS Code is running the server:**
   - Look in your terminal tabs/windows
   - Close any terminals running `npm run dev:server`

2. **Restart your computer** (last resort)

3. **Use a different port:**
   - Edit `.env` file and add: `PORT=4001`
   - Or edit `server/index.js` and change: `const port = process.env.PORT || 4001;`

---

## Quick One-Liner Commands

**Find and kill process on port 4000:**
```powershell
netstat -ano | findstr :4000 | findstr LISTENING | ForEach-Object { taskkill /PID ($_ -split '\s+')[-1] /F }
```

**Kill all Node.js processes:**
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Check if port is free:**
```powershell
netstat -ano | findstr :4000 | findstr LISTENING
```
(If this shows nothing, port is free)



