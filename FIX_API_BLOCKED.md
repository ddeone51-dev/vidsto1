# Fix: API_KEY_SERVICE_BLOCKED Error

Your API key is blocked from accessing the Generative Language API. Here's how to fix it:

## Step 1: Enable Generative Language API

1. Go to **[Google Cloud Console - APIs Library](https://console.cloud.google.com/apis/library)**
2. Search for **"Generative Language API"**
3. Click on it
4. Click **"Enable"** button
5. Wait 1-2 minutes for it to activate

## Step 2: Check API Key Restrictions

Your API key might have restrictions that are blocking access:

1. Go to **[Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)**
2. Click on your API key (the one starting with `AIzaSy...`)
3. Check **"API restrictions"** section:
   - If it says **"Restrict key"**, click **"Don't restrict key"** (for testing)
   - OR add **"Generative Language API"** to the allowed APIs list
4. Click **"Save"**

## Step 3: Enable Required APIs

Make sure these APIs are enabled:

1. **[Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com)** ✅
2. **[Cloud Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)** ✅
3. **[Vertex AI API](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com)** ✅ (for Imagen)

## Step 4: Verify API Key Permissions

1. In [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your API key
3. Under **"API restrictions"**, make sure:
   - Either **"Don't restrict key"** is selected
   - OR **"Restrict key"** is selected AND **"Generative Language API"** is in the list

## Step 5: Restart Server

After enabling APIs and fixing restrictions:

1. Stop your server (Ctrl+C)
2. Restart it:
   ```powershell
   cd c:\vidsto
   $env:GOOGLE_API_KEY = "AIzaSyCTySJHkjtaCdJ_WgjeL8TYqNfrO6swChs"
   npm run dev:server
   ```

## Quick Checklist

- [ ] Generative Language API is enabled
- [ ] Cloud Text-to-Speech API is enabled  
- [ ] Vertex AI API is enabled
- [ ] API key has no restrictions OR Generative Language API is in allowed list
- [ ] Billing is enabled (required for Imagen)
- [ ] Server restarted after making changes

## Still Not Working?

If you still get errors:
1. Try creating a **new API key** without restrictions
2. Make sure you're using the correct project in Google Cloud Console
3. Wait 2-3 minutes after enabling APIs for them to activate


























