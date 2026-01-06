# Google Generative API Setup

This project now uses **Google Generative APIs** for all AI services:

## Services Using Google APIs

### ✅ Text Generation (Gemini)
- **Service**: Google Gemini 2.5 Flash
- **Used for**: Story generation, scene breakdown, narration scripts
- **API**: `@google/generative-ai` SDK
- **Status**: Already configured ✓

### ✅ Image Generation (Imagen)
- **Service**: Google Imagen 4.0
- **Used for**: Scene image generation
- **API**: Google Generative Language API (`generativelanguage.googleapis.com`)
- **Model**: `imagen-4.0-generate-001`
- **Status**: Configured ✓

### ✅ Audio Generation (Text-to-Speech)
- **Service**: Google Cloud Text-to-Speech API
- **Used for**: Narration audio generation
- **API**: `texttospeech.googleapis.com`
- **Status**: Now using Google Cloud TTS (switched from gTTS) ✓

## Setup Requirements

### 1. Google API Key
You need a **Google API Key** with access to:
- Gemini API (for text generation)
- Imagen API (for image generation) 
- Cloud Text-to-Speech API (for audio generation)

**Get your API key:**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Enable the required APIs in [Google Cloud Console](https://console.cloud.google.com/)

### 2. Enable Required APIs
In Google Cloud Console, enable:
- ✅ **Generative Language API** (for Gemini and Imagen)
- ✅ **Cloud Text-to-Speech API**

### 3. Set Environment Variable
```powershell
# Windows PowerShell
$env:GOOGLE_API_KEY = "your-api-key-here"

# To make it persistent (requires new terminal)
[System.Environment]::SetEnvironmentVariable('GOOGLE_API_KEY', 'your-api-key-here', 'User')
```

```bash
# macOS/Linux
export GOOGLE_API_KEY="your-api-key-here"
```

### 4. Billing (Required for Imagen)
⚠️ **Important**: Imagen API requires billing to be enabled on your Google Cloud account.

- Go to [Google Cloud Billing](https://console.cloud.google.com/billing)
- Enable billing for your project
- Ensure the Imagen API is enabled

## API Usage

### Text Generation (Gemini)
- Uses `gemini-2.5-flash` model
- Handles story, scenes, and narration generation
- Includes safety filters

### Image Generation (Imagen 4.0)
- Uses `imagen-4.0-generate-001` model
- Supports aspect ratios: 1:1, 3:4, 4:3, 9:16, 16:9
- Generates up to 2K resolution images
- Uses Gemini API format: `generateContent` endpoint

### Audio Generation (Cloud TTS)
- Uses Neural2 voices for high-quality audio
- Supports multiple languages:
  - English (en-US, en-GB)
  - Spanish (es-ES)
  - French (fr-FR)
  - Hindi (hi-IN)
  - Japanese (ja-JP)
  - Swahili (sw-KE)
  - And more...
- Generates MP3 audio format

## Language Code Mapping

The TTS generator automatically maps simple language codes to Google Cloud TTS format:
- `en` → `en-US`
- `es` → `es-ES`
- `fr` → `fr-FR`
- `hi` → `hi-IN`
- `ja` → `ja-JP`
- `sw` → `sw-KE`

## Troubleshooting

### "Imagen API requires billing"
- Enable billing in Google Cloud Console
- Ensure Imagen API is enabled for your project

### "TTS API error"
- Verify Cloud Text-to-Speech API is enabled
- Check that your API key has TTS permissions

### "Invalid API response format"
- Ensure you're using a valid Google API key
- Check that all required APIs are enabled
- Verify billing is enabled for Imagen

## Cost Considerations

- **Gemini API**: Free tier available, then pay-per-use
- **Imagen API**: Requires billing, pay-per-image
- **Cloud TTS**: Free tier (0-4 million characters/month), then pay-per-character

Check [Google Cloud Pricing](https://cloud.google.com/pricing) for current rates.


























