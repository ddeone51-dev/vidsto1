# Setup Vertex AI Service Account on Render

## The Problem

Vertex AI needs a service account JSON file, but Render doesn't have it. The error shows:
```
Service account file not found at: /opt/render/project/src/vertex-sa.json
```

## Solution: Use Environment Variable

I've updated the code to support reading the service account JSON from an environment variable.

### Step 1: Get Your Service Account JSON

1. Go to **Google Cloud Console** → **IAM & Admin** → **Service Accounts**
2. Find your service account (or create one)
3. Click **"Keys"** → **"Add Key"** → **"Create new key"**
4. Choose **JSON** format
5. Download the JSON file

### Step 2: Set Environment Variable in Render

1. **Open the JSON file** you downloaded
2. **Copy the entire JSON content** (all of it, including `{` and `}`)
3. Go to **Render Dashboard** → Your Service → **Environment** tab
4. Click **"Add Environment Variable"**
5. **Key**: `VERTEX_SA_JSON`
6. **Value**: Paste the entire JSON content (it should start with `{` and end with `}`)
7. **Save**

### Step 3: Set Project ID (if not in JSON)

If your service account JSON doesn't have `project_id`, also set:

1. **Key**: `GOOGLE_CLOUD_PROJECT_ID`
2. **Value**: Your Google Cloud project ID (e.g., `my-project-123456`)
3. **Save**

### Step 4: Redeploy

Render will automatically redeploy. After redeploy, check logs - you should see:
```
[Vertex AI] ✓ Created service account file from VERTEX_SA_JSON environment variable
[Vertex AI] ✓ Service account email: your-service@project.iam.gserviceaccount.com
[Vertex AI] ✓ Project: your-project-id
```

---

## Example VERTEX_SA_JSON Value

The value should look like this (but with your actual values):

```json
{
  "type": "service_account",
  "project_id": "my-project-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "my-service@my-project-123456.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/my-service%40my-project-123456.iam.gserviceaccount.com"
}
```

**Important**: Paste the ENTIRE JSON, including the curly braces!

---

## Required Permissions

Make sure your service account has:
- **`roles/aiplatform.user`** role (for Vertex AI)

To add permissions:
1. Go to **Google Cloud Console** → **IAM & Admin** → **IAM**
2. Find your service account
3. Click **"Edit"** → **"Add Another Role"**
4. Select **"Vertex AI User"** (`roles/aiplatform.user`)
5. **Save**

---

## After Setup

Once you've set `VERTEX_SA_JSON` and redeployed:
- ✅ Vertex AI will be used for image generation
- ✅ No need to upload `vertex-sa.json` file
- ✅ Service account credentials are secure (stored as environment variable)

---

**Set `VERTEX_SA_JSON` environment variable in Render with your service account JSON content!** 🚀

