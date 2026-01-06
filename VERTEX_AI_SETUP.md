# Vertex AI (NanoBanana) Image Generation Setup

This guide will help you set up Google Vertex AI for image generation in Vidisto.

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Vertex AI API** enabled in your Google Cloud project
3. **API Key** created from Vertex AI in Google Cloud Console

## Step 1: Enable Vertex AI API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Library**
4. Search for **"Vertex AI API"**
5. Click **Enable**

## Step 2: Get Your API Key

### Option A: Create API Key from Vertex AI

1. Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"API Key"**
4. Copy the generated API key

### Option B: Use Existing API Key

If you already have a Google API key with Vertex AI access, you can use that.

## Step 3: Get Your Project ID (Optional but Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Your **Project ID** is shown at the top of the page
3. Copy it (it looks like: `my-project-12345`)

## Step 4: Set Environment Variables

### Windows PowerShell

```powershell
# Set Vertex AI API Key (required)
$env:VERTEX_AI_API_KEY = "your-vertex-ai-api-key-here"

# Set Image Provider to use Vertex AI
$env:IMAGE_PROVIDER = "vertex"

# Optional: Set Project ID (recommended)
$env:GOOGLE_CLOUD_PROJECT_ID = "your-project-id"

# Optional: Set Location (defaults to us-central1)
$env:GOOGLE_CLOUD_LOCATION = "us-central1"
```

### Windows Command Prompt

```cmd
set VERTEX_AI_API_KEY=your-vertex-ai-api-key-here
set IMAGE_PROVIDER=vertex
set GOOGLE_CLOUD_PROJECT_ID=your-project-id
set GOOGLE_CLOUD_LOCATION=us-central1
```

### macOS/Linux

```bash
export VERTEX_AI_API_KEY="your-vertex-ai-api-key-here"
export IMAGE_PROVIDER="vertex"
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"
```

### Or Add to .env File

Create or edit `.env` file in the project root:

```env
VERTEX_AI_API_KEY=your-vertex-ai-api-key-here
IMAGE_PROVIDER=vertex
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

## Step 5: Verify Setup

1. Restart your server
2. Check the server logs - you should see:
   ```
   VERTEX_AI_API_KEY: AIza... (length: 39)
   IMAGE_PROVIDER: vertex
   ```

## Available Image Providers

You can switch between image providers using the `IMAGE_PROVIDER` environment variable:

- `vertex` or `vertexai` or `nanobanana` - Uses Vertex AI (NanoBanana)
- `leonardo` - Uses Leonardo AI
- (default) - Uses Google Imagen via Generative Language API

## Troubleshooting

### "Missing Vertex AI API key"
- Make sure `VERTEX_AI_API_KEY` is set in your environment
- Restart your server after setting the variable

### "Vertex AI API error (401/403)"
- Verify your API key is correct
- Make sure Vertex AI API is enabled in your project
- Check that billing is enabled

### "Invalid Vertex AI API response format"
- The API response format might be different
- Check your project ID and location settings
- Try setting `GOOGLE_CLOUD_PROJECT_ID` explicitly

### "Billing required"
- Vertex AI requires billing to be enabled
- Go to [Google Cloud Billing](https://console.cloud.google.com/billing)
- Enable billing for your project

## Supported Locations

Common Vertex AI locations:
- `us-central1` (default)
- `us-east1`
- `us-west1`
- `europe-west1`
- `asia-east1`

## Model Information

The default model used is `imagegeneration@006` (Imagen 3 via Vertex AI).

You can customize the model by modifying `src/vertexAIImageGenerator.js` if needed.

## Need Help?

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Vertex AI Image Generation](https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images)
- [Google Cloud Console](https://console.cloud.google.com/)



