# Fix Google Sign-In Warnings

## The Issue

You're seeing these browser console warnings:
```
Feature Policy: Skipping unsupported feature name "identity-credentials-get"
[GSI_LOGGER]: The given client ID is not found.
```

## What This Means

Google Sign-In (GSI) is trying to initialize but:
- ❌ `VITE_GOOGLE_CLIENT_ID` environment variable is not set or invalid
- ❌ The Google OAuth client ID is not configured

## Solutions

### Option 1: Disable Google Sign-In (Recommended if you don't need it)

**If you don't need Google Sign-In**, the warnings are harmless. The code already hides the Google Sign-In button when the client ID is missing.

**No action needed** - the warnings won't affect functionality.

---

### Option 2: Set Up Google Sign-In (If you want to use it)

#### Step 1: Create Google OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (for local development)
   - `https://techland.co.tz` (for production)
7. Copy the **Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)

#### Step 2: Set Environment Variables

**For Local Development:**

Create `web/.env.local`:
```env
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

**For Production (Render Backend):**

In Render dashboard, add:
- **Key**: `GOOGLE_CLIENT_ID`
- **Value**: Your OAuth client ID

**For Production Frontend:**

When building the frontend, set:
```bash
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com npm run build
```

Or add it to your build process.

---

## What I Fixed

✅ Updated the code to:
- Only load Google Sign-In script when client ID is valid
- Hide the "Or continue with" divider when Google Sign-In is disabled
- Add error handling to prevent console errors
- Better validation of client ID

---

## Current Status

After the fix:
- ✅ Warnings will be suppressed if Google Sign-In is not configured
- ✅ Google Sign-In button will be hidden if not configured
- ✅ No errors in console if you don't need Google Sign-In

---

**If you don't need Google Sign-In, you can ignore these warnings - they're harmless!** 🎉

