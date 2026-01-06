# Separate Subtitle Pipeline Implementation

## System Rule
**Video generation and subtitle generation MUST be two separate pipelines. Subtitles must NEVER be generated or burned during initial video creation.**

## Changes Required

### 1. Video Generation Pipeline (`assembleVideo`)
- Remove ALL subtitle processing code
- Export video WITHOUT subtitles
- Mark video as FINAL

### 2. New Subtitle Generation Method (`generateSubtitles`)
- Generate subtitles from story text or STT word timestamps
- Create ASS file (UTF-8 encoding)
- Return subtitle file path

### 3. New Subtitle Burning Method (`burnSubtitles`)
- Burn subtitles into existing video file
- Use FFmpeg: `ffmpeg -i video.mp4 -vf "subtitles=subtitles.ass" -c:a copy output.mp4`
- Return video with burned subtitles

### 4. Server Endpoints
- `/api/video/assemble` - NO subtitles (video only)
- `/api/subtitles/generate` - Generate subtitle file
- `/api/subtitles/burn` - Burn subtitles into video

### 5. Frontend Changes
- Remove subtitle generation from video creation flow
- Add separate subtitle generation UI (on-demand)
- Add subtitle preview before burning
- Add options: Burn subtitles OR Download subtitle file

## Implementation Status
- ✅ Video assembly updated to ignore subtitles
- ⏳ Subtitle generation method needs to be added
- ⏳ Subtitle burning method needs to be added
- ⏳ Server endpoints need to be created
- ⏳ Frontend needs to be updated



