# Starting Backend Server (CMD/Command Prompt)

## Step 1: Stop Existing Server on Port 4000

First, you need to stop whatever is using port 4000:

### Option A: Find and Stop the Process
```cmd
netstat -ano | findstr :4000
```
This will show you the Process ID (PID). Then:
```cmd
taskkill /PID <PID_NUMBER> /F
```

### Option B: Kill All Node Processes (if you're sure)
```cmd
taskkill /IM node.exe /F
```

## Step 2: Set API Key (CMD Syntax)

In **Command Prompt (CMD)**, use:
```cmd
set GOOGLE_API_KEY=AIzaSyCTySJHkjtaCdJ_WgjeL8TYqNfrO6swChs
```

**Note:** In CMD, use `set` not `$env:`

## Step 3: Start Server

```cmd
cd c:\vidsto
npm run dev:server
```

## Complete Sequence (CMD)

```cmd
cd c:\vidsto
set GOOGLE_API_KEY=AIzaSyCTySJHkjtaCdJ_WgjeL8TYqNfrO6swChs
npm run dev:server
```

## Verify API Key is Set

```cmd
echo %GOOGLE_API_KEY%
```

## If Using PowerShell Instead

If you want to use PowerShell (recommended), open PowerShell and use:
```powershell
cd c:\vidsto
$env:GOOGLE_API_KEY = "AIzaSyCTySJHkjtaCdJ_WgjeL8TYqNfrO6swChs"
npm run dev:server
```


























