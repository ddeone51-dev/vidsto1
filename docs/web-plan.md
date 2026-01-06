# Vidisto Web Experience Plan

## Goals
- Provide an interactive browser interface for story, scene, and narration generation.
- Keep Google API key server-side only.
- Reuse existing Node modules (`StoryGenerator`, `SceneBreakdownGenerator`, `NarrationGenerator`).

## Architecture
1. **Backend API (Express)**
   - Endpoint `POST /api/story`: body `{ title, language, minutes, summary }`.
   - Endpoint `POST /api/scenes`: body `{ story, minScenes?, maxScenes? }`.
   - Endpoint `POST /api/narration`: body `{ story, language?, tone? }`.
   - All endpoints validate payloads, call the corresponding generator, return JSON.
   - Middlewares for error handling and basic rate limiting (later).

2. **Frontend (Vite + React + TypeScript)**
   - Pages/sections:
     - **Story Builder Form**: collects inputs, triggers `/api/story`.
     - **Scene Breakdown**: displays cards (title, description, image prompt) once story exists.
     - **Narration Preview**: shows paragraphs of narration text.
   - Uses React Query (or simple hooks) for request state + caching.
   - Component structure:
     - `StoryForm`
     - `ScenesList`
     - `NarrationViewer`
     - `OutputPanel` wrappers with copy buttons.
   - Styling: Tailwind CSS for quick iteration.

3. **Local Development Flow**
   - `npm run dev:api` → starts Express server (port 4000).
   - `npm run dev:web` → starts Vite dev server (port 5173, proxy `/api` to 4000).
   - Shared env file `.env` for `GOOGLE_API_KEY` (server only). Frontend uses `.env` for API base URL only.

4. **Deployment Considerations**
   - Deploy API to Vercel/Render/Fly (Node runtime). Set `GOOGLE_API_KEY` as secret.
   - Deploy frontend static build (Vercel/Netlify) with environment variable `VITE_API_BASE_URL` pointing to API host.
   - Add simple auth (API key header) before public release.

## Next Steps
1. Scaffold Express backend under `server/` with routes + shared validation utilities.
2. Scaffold Vite + React app under `web/` with Tailwind, React Query, and base layout.
3. Wire frontend forms to API, add loading/error handling, provide output viewers.
4. Add integration tests (Vitest + React Testing Library) and manual walkthrough docs.


