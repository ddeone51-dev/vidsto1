# Vertex AI Service Account Authentication Setup

## Overview

The Vertex AI image generator has been updated to use **service account authentication** instead of API keys. This provides better security and is the recommended approach for Google Cloud services.

## Changes Made

1. **Updated `src/vertexAIImageGenerator.js`**:
   - Removed API key authentication (`?key=${apiKey}`)
   - Added service account authentication using `google-auth-library`
   - Uses OAuth2 access tokens in `Authorization: Bearer` header
   - Automatically loads service account credentials from JSON file

2. **Updated `server/index.js`**:
   - Updated environment variable logging to show service account path instead of API key

## Service Account File Location

The service account JSON file is loaded in this priority order:

1. **Explicit parameter** (if passed to constructor)
2. **`GOOGLE_APPLICATION_CREDENTIALS`** environment variable
3. **`vertex-sa.json`** in the project root directory (default)

## Required Service Account Permissions

Your service account needs the following IAM roles:

- **Vertex AI User** (`roles/aiplatform.user`) - Required for using Vertex AI APIs
- **Service Account Token Creator** (if using impersonation)

## Setup Instructions

### Option 1: Use Default Location (Recommended)

1. Place your service account JSON file at the project root:
   ```
   C:\vidsto1\vertex-sa.json
   ```

2. The file should contain:
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
     ...
   }
   ```

3. The project ID will be automatically read from the JSON file if not set in environment variables.

### Option 2: Use Environment Variable

1. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to your service account file:
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\your\service-account.json"
   ```

2. Or add it to your `.env` file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your\service-account.json
   ```

## Environment Variables

The following environment variables are still supported (optional):

- `GOOGLE_CLOUD_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT` - Project ID (can also be read from service account JSON)
- `GOOGLE_CLOUD_LOCATION` - Location (defaults to `us-central1`)

**Note**: `VERTEX_AI_API_KEY` is no longer used. The service account JSON file replaces it.

## Verification

When the server starts, you should see:
```
[Vertex AI] Initialized with service account: your-service-account@your-project.iam.gserviceaccount.com
[Vertex AI] Project: your-project-id, Location: us-central1, Model: imagegeneration@006
```

## Troubleshooting

### Error: "Service account file not found"
- Ensure `vertex-sa.json` exists in the project root, OR
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### Error: "Failed to authenticate with service account"
- Check that the service account JSON file is valid
- Verify the service account has the "Vertex AI User" role
- Ensure Vertex AI API is enabled in your Google Cloud project

### Error: "Project ID is required"
- Set `GOOGLE_CLOUD_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT` environment variable, OR
- Ensure your service account JSON file contains a `project_id` field

## Benefits of Service Account Authentication

1. **Better Security**: No API keys in query parameters
2. **IAM Integration**: Fine-grained permissions control
3. **Token Management**: Automatic token refresh
4. **Best Practice**: Recommended by Google Cloud for server-to-server authentication



