# Troubleshoot Vertex AI Gemini 404 Error

## The Problem

```
Publisher Model `projects/idyllic-now-398917/locations/us-central1/publishers/google/models/gemini-1.5-flash-001` was not found
```

## Possible Causes

### 1. Vertex AI API Not Enabled

**Check:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Library**
3. Search for **"Vertex AI API"**
4. Make sure it's **ENABLED**

**Enable it:**
- Click on **Vertex AI API**
- Click **"Enable"**

### 2. Generative AI API Not Enabled

**Check:**
1. Go to **APIs & Services** → **Library**
2. Search for **"Generative Language API"**
3. Make sure it's **ENABLED**

### 3. Model Not Available in Region

**Try a different region:**
- Set `GOOGLE_CLOUD_LOCATION=europe-west1` or `us-east1`
- Some models might not be available in all regions

### 4. Model Name Wrong

**Try different model names:**
- `gemini-1.5-flash-001` (current)
- `gemini-1.5-pro-002`
- `gemini-2.0-flash-exp` (experimental)

### 5. Service Account Permissions

**Check service account has:**
- `roles/aiplatform.user` role
- Access to Vertex AI API

---

## Quick Fixes to Try

### Fix 1: Enable APIs

1. **Enable Vertex AI API:**
   - Go to [APIs & Services](https://console.cloud.google.com/apis/library)
   - Search "Vertex AI API" → Enable

2. **Enable Generative Language API:**
   - Search "Generative Language API" → Enable

### Fix 2: Try Different Model

In Render, you can set:
- **Key**: `VERTEX_GEMINI_MODEL`
- **Value**: `gemini-1.5-pro-002`

### Fix 3: Try Different Region

In Render:
- **Key**: `GOOGLE_CLOUD_LOCATION`
- **Value**: `europe-west1` (or `us-east1`)

---

## Alternative: Use Gemini API Instead

If Vertex AI Gemini doesn't work, you can disable it:

**In Render:**
- **Key**: `USE_VERTEX_AI_GEMINI`
- **Value**: `false` (or delete it)

This will use the Gemini API (which you already have working) for story/scene generation, and Vertex AI for images.

---

**Try enabling the APIs first - that's most likely the issue!** 🔧

