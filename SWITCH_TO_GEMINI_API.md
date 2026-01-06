# Switch Back to Gemini API for Stories/Scenes

## What Changed

We're switching from **Vertex AI Gemini** (which was giving 404 errors) back to **Gemini API** (which works with API keys).

## Current Setup

### ✅ Images
- **Service**: Vertex AI Imagen 3.0
- **Status**: Working perfectly!
- **Uses**: Service account authentication

### ✅ Stories & Scenes  
- **Service**: Gemini API (gemini-2.5-flash)
- **Status**: Will work after you update Render settings
- **Uses**: GOOGLE_API_KEY

---

## Steps to Update Render

### 1. Go to Render Dashboard
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click on your **vidsto-api** service
3. Go to **Environment** tab

### 2. Update Environment Variables

**Find this variable:**
- `USE_VERTEX_AI_GEMINI`

**Do ONE of these:**
- **Option A**: Delete it completely (recommended)
- **Option B**: Set it to `false`

**Make sure these are set:**
- ✅ `GOOGLE_API_KEY` = Your Google API key (should already be set)
- ✅ `IMAGE_PROVIDER` = `vertex` (for images)
- ✅ `VERTEX_SA_JSON` = Your service account JSON (for images)

### 3. Save and Redeploy

After updating, Render will automatically redeploy. Or click **Manual Deploy** → **Deploy latest commit**.

---

## What You'll See in Logs

After redeploy, you should see:
```
[Server] Environment check:
  USE_VERTEX_AI_GEMINI: false (using Gemini API)
```

And when generating stories/scenes:
```
[StoryGenerator] Using Gemini API for story generation
```

---

## Result

✅ **Stories/Scenes**: Will use Gemini API (works, but has safety filters)
✅ **Images**: Will use Vertex AI Imagen (already working)

---

## Note About Safety Filters

Gemini API has non-configurable safety filters. If you get `PROHIBITED_CONTENT` errors:
- Try rephrasing your story with more neutral language
- Avoid potentially sensitive topics
- The filters are Google's safety measures and cannot be disabled

---

**After updating Render, test by generating a story!** 🚀

