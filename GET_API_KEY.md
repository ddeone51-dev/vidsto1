# How to Get Your Google Generative API Key

Follow these steps to get your API key and set up access to Google's Generative AI services.

## Step 1: Get Your API Key

### Option A: Quick Setup (Recommended)
1. Go to **[Google AI Studio](https://aistudio.google.com/app/apikey)**
2. Sign in with your Google account
3. Click **"Create API Key"** or **"Get API Key"**
4. Select an existing Google Cloud project or create a new one
5. Copy your API key (it will look like: `AIzaSy...`)

### Option B: Via Google Cloud Console
1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Sign in with your Google account
3. Create a new project (or select an existing one):
   - Click the project dropdown at the top
   - Click **"New Project"**
   - Enter a project name (e.g., "Vidisto")
   - Click **"Create"**
4. Go to **"APIs & Services"** → **"Credentials"**
5. Click **"Create Credentials"** → **"API Key"**
6. Copy your API key

## Step 2: Enable Required APIs

Your API key needs access to these services:

### Enable via Google Cloud Console:

1. Go to **[Google Cloud Console](https://console.cloud.google.com/)**
2. Select your project
3. Go to **"APIs & Services"** → **"Library"**
4. Search for and enable each of these APIs:

   **Required APIs:**
   - ✅ **Generative Language API** (for Gemini and Imagen)
     - Search: "Generative Language API"
     - Click "Enable"
   
   - ✅ **Cloud Text-to-Speech API** (for audio)
     - Search: "Cloud Text-to-Speech API"
     - Click "Enable"
   
   - ✅ **Imagen API** (for image generation)
     - Search: "Imagen API" or "Vertex AI API"
     - Click "Enable"

### Quick Enable Links:
- [Enable Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com)
- [Enable Cloud Text-to-Speech API](https://console.cloud.google.com/apis/library/texttospeech.googleapis.com)
- [Enable Vertex AI API](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com) (includes Imagen)

## Step 3: Set Up Billing (Required for Imagen)

⚠️ **Important**: Imagen API requires billing to be enabled.

1. Go to **[Google Cloud Billing](https://console.cloud.google.com/billing)**
2. Click **"Link a billing account"** or **"Create billing account"**
3. Enter your payment information
4. Link the billing account to your project

**Note**: Google provides free credits for new accounts, and Imagen has a free tier.

## Step 4: Set Your API Key

### Windows PowerShell:
```powershell
# Set for current session
$env:GOOGLE_API_KEY = "your-api-key-here"

# Set permanently (requires new terminal)
[System.Environment]::SetEnvironmentVariable('GOOGLE_API_KEY', 'your-api-key-here', 'User')
```

### Windows Command Prompt (CMD):
```cmd
# Set for current session
set GOOGLE_API_KEY=your-api-key-here

# Set permanently
setx GOOGLE_API_KEY "your-api-key-here"
```

### macOS/Linux:
```bash
# Set for current session
export GOOGLE_API_KEY="your-api-key-here"

# Set permanently (add to ~/.bashrc or ~/.zshrc)
echo 'export GOOGLE_API_KEY="your-api-key-here"' >> ~/.bashrc
source ~/.bashrc
```

### Verify it's set:
```powershell
# PowerShell
echo $env:GOOGLE_API_KEY

# CMD
echo %GOOGLE_API_KEY%

# macOS/Linux
echo $GOOGLE_API_KEY
```

## Step 5: Test Your Setup

1. Restart your backend server:
   ```powershell
   cd c:\vidsto
   npm run dev:server
   ```

2. You should see: `Vidisto API listening on http://localhost:4000`

3. Try generating a story in the web app to test if everything works!

## Troubleshooting

### "Missing Google API key"
- Make sure you set the environment variable correctly
- Restart your terminal/IDE after setting the variable
- Verify with `echo $env:GOOGLE_API_KEY` (PowerShell)

### "API not enabled"
- Go to Google Cloud Console → APIs & Services → Library
- Search for and enable the missing API
- Wait a few minutes for the API to activate

### "Billing required"
- Enable billing in Google Cloud Console
- Make sure billing is linked to your project
- Some APIs require billing even if you're using free tier

### "Invalid API key"
- Double-check you copied the entire key
- Make sure there are no extra spaces
- Verify the key is active in Google Cloud Console

## Security Best Practices

⚠️ **Never commit your API key to Git!**

1. Add to `.gitignore`:
   ```
   .env
   *.env
   ```

2. Use environment variables (as shown above)

3. For production, use secure secret management:
   - Google Cloud Secret Manager
   - Environment variables in your hosting platform
   - Never hardcode keys in your code

## Free Tier & Pricing

- **Gemini API**: Free tier available (check current limits)
- **Imagen API**: Free tier + pay-per-image
- **Cloud TTS**: Free tier (0-4 million characters/month)

Check current pricing: [Google Cloud Pricing](https://cloud.google.com/pricing)

## Need Help?

- [Google AI Studio Documentation](https://ai.google.dev/docs)
- [Google Cloud Console](https://console.cloud.google.com/)
- [API Status Dashboard](https://status.cloud.google.com/)


























