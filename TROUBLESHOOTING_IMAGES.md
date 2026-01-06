# Troubleshooting Image Generation Issues

If you're seeing "no images were generated successfully", follow these steps:

## Step 1: Check Server Logs

Look at your backend server terminal. You should see detailed error messages like:
- `[ImageGenerator] Response status: 400`
- `[ImageGenerator] API Error: ...`

These logs will tell you exactly what's wrong.

## Step 2: Common Issues

### Issue: "Billing required" or "Quota exceeded"
**Solution:**
1. Go to [Google Cloud Billing](https://console.cloud.google.com/billing)
2. Enable billing for your project
3. Wait a few minutes for it to activate
4. Try again

### Issue: "API not enabled"
**Solution:**
1. Go to [Google Cloud Console - APIs](https://console.cloud.google.com/apis/library)
2. Search for and enable:
   - **Generative Language API** (for Gemini and Imagen)
   - **Vertex AI API** (for Imagen)
3. Wait 2-3 minutes for APIs to activate
4. Try again

### Issue: "Invalid API key" or "Permission denied"
**Solution:**
1. Verify your API key is set: `echo $env:GOOGLE_API_KEY` (PowerShell)
2. Make sure the API key has access to:
   - Generative Language API
   - Vertex AI API
3. Check API key restrictions in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)

### Issue: "Invalid response format"
**Solution:**
This means the API responded but in an unexpected format. This could mean:
- The API format has changed
- Your API key doesn't have Imagen access
- Try enabling Vertex AI API specifically

## Step 3: Test Your API Key

You can test if your API key works by making a simple request:

```powershell
# Test Gemini API (should work)
$apiKey = $env:GOOGLE_API_KEY
Invoke-WebRequest -Uri "https://generativelanguage.googleapis.com/v1beta/models?key=$apiKey" -Method GET
```

If this works, your API key is valid. If not, check your API key.

## Step 4: Verify Imagen Access

Imagen requires:
1. ✅ Billing enabled
2. ✅ Generative Language API enabled
3. ✅ Vertex AI API enabled (sometimes required)
4. ✅ API key with proper permissions

## Step 5: Check Error Details

When image generation fails, check:
1. **Browser Console** (F12) - Look for error messages
2. **Backend Server Terminal** - Look for `[ImageGenerator]` logs
3. **Network Tab** (F12) - Check the actual API response

## Step 6: Alternative Solutions

If Imagen still doesn't work, you can:

1. **Use a different image service temporarily** (we can add this)
2. **Check Google Cloud Console** for any quota/billing issues
3. **Try regenerating your API key** with full permissions

## Getting More Help

If you're still stuck, share:
1. The exact error message from server logs
2. The response status code (e.g., 400, 403, 404)
3. Screenshot of Google Cloud Console showing enabled APIs


























