# Vidisto Video Generation Pipeline

Complete end-to-end AI video story creation platform using Google Gemini + Imagen.

## 🎯 Complete Workflow

1. **Generate Story** → AI-written narrative using Gemini
2. **Break into Scenes** → Structured scene breakdown with image prompts
3. **Generate Images** → Visual images from prompts using Imagen
4. **Create Narration** → TTS-friendly narration script
5. **Generate Audio** → Text-to-speech audio using gTTS
6. **Assemble Video** → Final MP4 video combining images + audio

## 🚀 Setup Instructions

### 1. Install FFmpeg (Required for Video Assembly)

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
# Add to PATH after installation
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

### 2. Set API Key

**Windows (PowerShell):**
```powershell
$env:GOOGLE_API_KEY = "your-api-key-here"
```

**Windows (CMD):**
```cmd
set GOOGLE_API_KEY=your-api-key-here
```

**Persistent (Windows):**
```cmd
setx GOOGLE_API_KEY "your-api-key-here"
# Then open a new terminal
```

**macOS/Linux:**
```bash
export GOOGLE_API_KEY="your-api-key-here"
```

### 3. Start the Server

```bash
cd C:\vidsto
npm run dev:server
```

The server will start on `http://localhost:4000`

### 4. Start the Web UI

```bash
cd C:\vidsto\web
npm run dev
```

The web app will start on `http://localhost:5173` (or next available port)

## 📋 API Endpoints

- `POST /api/story` - Generate story text
- `POST /api/scenes` - Generate scene breakdown
- `POST /api/narration` - Generate narration script
- `POST /api/images/generate` - Generate single image
- `POST /api/images/generate-batch` - Generate multiple images
- `POST /api/tts/generate` - Generate TTS audio
- `POST /api/video/assemble` - Assemble final video

## 🎨 Features

### Image Generation
- Uses Google Imagen 4.0 for high-quality image generation
- Supports custom aspect ratios (default: 16:9)
- Batch generation for all scene images at once

### Text-to-Speech
- Uses gTTS (Google Text-to-Speech) for narration
- Supports multiple languages
- Generates MP3 audio files

### Video Assembly
- Combines images and audio using FFmpeg
- Creates MP4 video files
- Configurable image duration per scene

## ⚠️ Important Notes

1. **Imagen API Access**: Your API key must have access to Imagen models. If image generation fails, verify:
   - Your API key has Imagen API enabled
   - The model `imagen-4.0-generate-001` is available in your region
   - API quota/billing is set up correctly

2. **FFmpeg Required**: Video assembly will fail without FFmpeg installed and in your PATH.

3. **Temporary Files**: Video assembly creates temporary files in `./temp/videos`. Clean up periodically if needed.

## 🐛 Troubleshooting

### "FFmpeg not found"
- Install FFmpeg and ensure it's in your system PATH
- Test with: `ffmpeg -version`

### "Imagen API error"
- Verify your API key has Imagen access
- Check API quotas in Google Cloud Console
- Try with a different model name if needed

### "Failed to generate images"
- The API key might not have Imagen API enabled
- Some regions may not have Imagen access
- Check error message for specific API issues

## 📦 Dependencies

- `@google/generative-ai` - Gemini models
- `gtts` - Text-to-speech
- `express` - API server
- `ffmpeg` - Video assembly (system-level)

## 🎬 Usage Example

1. Open `http://localhost:5173` in your browser
2. Fill in story details (title, language, minutes)
3. Click "Generate Story"
4. Click "Preview Scenes"
5. Click "Generate images for scenes" → Wait for images
6. Click "Preview Narration"
7. Click "Generate narration audio" → Wait for audio
8. Click "Assemble Video" → Wait for video creation
9. Click "Download Video" to save your story!

## 📝 Notes

- Images are displayed directly in scene cards after generation
- Audio can be previewed with the built-in audio player
- Video can be previewed and downloaded once assembled
- All generated content is cached in the UI until you generate new content


