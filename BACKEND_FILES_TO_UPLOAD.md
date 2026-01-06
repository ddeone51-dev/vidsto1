# Backend Files to Upload to public_html/api/

This document clarifies exactly which files and folders need to be uploaded to `public_html/api/` on your cPanel server.

## Files and Folders to Upload

Upload these items from your project root to `public_html/api/`:

### Required Folders:
1. **`server/`** - Entire folder (contains: app.js, auth.js, azampay.js, createAdmin.js, db.js, index.js)
2. **`src/`** - Entire folder (contains all the generator files like storyGenerator.js, imageGenerator.js, etc.)

### Required Files:
3. **`package.json`** - Root level package.json (not the one in web/ folder)
4. **`package-lock.json`** - Root level package-lock.json (optional but recommended for consistent installs)

### Optional Files (if you use them):
5. **`vertex-sa.json`** - Only if you're using Vertex AI for image generation
   - If you're using Google Imagen API (not Vertex AI), you DON'T need this file
   - If you're using Leonardo AI, you DON'T need this file

### Folders to Create (empty folders):
6. **`data/`** - Create empty folder (database file will be created automatically)
7. **`temp/`** - Create empty folder (server will create subfolders for videos/images)
8. **`uploads/`** - Create empty folder (server will create subfolders)

### Files NOT to Upload:
- ❌ `web/` folder (this is the frontend, goes to public_html/ instead)
- ❌ `node_modules/` (will be installed on server via npm install)
- ❌ `tests/` folder (not needed for production)
- ❌ All the `.md` documentation files (not needed on server)
- ❌ `docker-compose.yml`, `Dockerfile` (not needed for cPanel)
- ❌ Any config files like `vercel.json`, `railway.json`, etc.
- ❌ Scripts folder (optional, not required for basic functionality)

## Final Structure Should Look Like:

```
public_html/
├── index.html (from web/dist/)
├── assets/ (from web/dist/assets/)
├── .htaccess (create this file)
└── api/
    ├── server/
    │   ├── app.js
    │   ├── auth.js
    │   ├── azampay.js
    │   ├── createAdmin.js
    │   ├── db.js
    │   └── index.js
    ├── src/
    │   ├── imageGenerator.js
    │   ├── index.js
    │   ├── leonardoImageGenerator.js
    │   ├── narrationGenerator.js
    │   ├── sceneBreakdownGenerator.js
    │   ├── speechToText.js
    │   ├── storyGenerator.js
    │   ├── ttsGenerator.js
    │   ├── vertexAIImageGenerator.js
    │   └── videoAssembler.js
    ├── package.json
    ├── package-lock.json
    ├── vertex-sa.json (if using Vertex AI)
    ├── data/ (empty folder)
    ├── temp/ (empty folder)
    ├── uploads/ (empty folder)
    └── .env (create this file with your API keys)
```

## Summary

**Minimal files needed:**
- `server/` folder
- `src/` folder  
- `package.json` file
- `data/` folder (empty)
- `temp/` folder (empty)
- `uploads/` folder (empty)

**That's it!** Everything else (node_modules, database file, etc.) will be created when you run `npm install` on the server.

