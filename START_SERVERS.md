# Starting Your Servers with API Key

## Quick Start

### 1. Set API Key (if not already set)
```powershell
$env:GOOGLE_API_KEY = "AIzaSyCTySJHkjtaCdJ_WgjeL8TYqNfrO6swChs"
```

### 2. Start Backend Server
Open a **new PowerShell terminal** and run:
```powershell
cd c:\vidsto
npm run dev:server
```

You should see:
```
Vidisto API listening on http://localhost:4000
```

### 3. Start Frontend Server
Open **another PowerShell terminal** and run:
```powershell
cd c:\vidsto\web
npm run dev
```

You should see:
```
VITE v7.2.2  ready in XXXX ms
Local:   http://localhost:5173/
```

### 4. Open in Browser
Go to: **http://localhost:5173**

## Troubleshooting

### If you see "Missing Google API key"
1. Make sure you set the environment variable in the same terminal where you're running the server
2. Or restart your terminal after setting it permanently

### If APIs aren't working
- Make sure you enabled:
  - ✅ Generative Language API
  - ✅ Cloud Text-to-Speech API
  - ✅ Vertex AI API (for Imagen)
- Wait a few minutes after enabling APIs for them to activate

### If Imagen fails with "billing required"
- Go to [Google Cloud Billing](https://console.cloud.google.com/billing)
- Enable billing for your project
- This is required even for free tier usage

## Testing Your Setup

1. Fill in the form on the web page
2. Click "Generate Video"
3. Watch the progress - it should work through all steps:
   - ✅ Generate Story
   - ✅ Generate Scenes  
   - ✅ Generate Images
   - ✅ Generate Narration
   - ✅ Generate Audio
   - ✅ Assemble Video

If any step fails, check the error message in the UI for details.


























