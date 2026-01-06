# Disable Vertex AI Gemini (Use Gemini API Instead)

## Quick Fix

Since Vertex AI Gemini is having issues, you can disable it and use the regular Gemini API (which is already working) for story/scene generation.

### In Render Dashboard:

1. Go to **Environment** tab
2. Find **`USE_VERTEX_AI_GEMINI`**
3. **Delete it** or set value to `false`
4. **Save**

This will:
- ✅ Use **Gemini API** for story/scene generation (already working)
- ✅ Use **Vertex AI** for image generation (already working)
- ✅ Everything will work!

---

## Why This Works

- **Story/Scene generation** → Gemini API (works fine, just has safety filters)
- **Image generation** → Vertex AI (already working!)

The only downside is story/scene generation will still use Gemini API which has strict safety filters, but at least it works!

---

## Alternative: Keep Trying Vertex AI Gemini

If you want to keep trying Vertex AI Gemini:

1. **Enable APIs** in Google Cloud Console:
   - Vertex AI API
   - Generative Language API

2. **Check service account permissions**:
   - Needs `roles/aiplatform.user`

3. **Try different regions**:
   - Set `GOOGLE_CLOUD_LOCATION=europe-west1`

---

**For now, disable `USE_VERTEX_AI_GEMINI` to get everything working!** 🚀

