import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join, resolve, dirname, basename } from "path";
import { existsSync } from "fs";

const execAsync = promisify(exec);

/**
 * Assembles images and audio into a video file using FFmpeg.
 * Requires FFmpeg to be installed on the system.
 */
export class VideoAssembler {
  constructor({ outputDir = "./temp" } = {}) {
    this.outputDir = outputDir;
  }

  /**
   * Ensure output directory exists.
   * @private
   */
  async #ensureOutputDir() {
    if (!existsSync(this.outputDir)) {
      await mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * Get audio duration in seconds.
   * @private
   */
  async #getAudioDuration(audioPath) {
    try {
      const normalizedPath = resolve(audioPath).replace(/\\/g, "/");
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${normalizedPath}"`,
        { maxBuffer: 1024 * 1024 }
      );
      const duration = parseFloat(stdout.trim());
      if (isNaN(duration) || duration <= 0) {
        return 10; // Default fallback
      }
      return duration;
    } catch (error) {
      console.warn("Could not detect audio duration:", error.message);
      return 10; // Default fallback
    }
  }

  /**
   * Create a video from images and narration audio.
   * @param {{
   *   images: Array<{ imageData: string, mimeType: string, duration?: number }>,
   *   audio: { audioData: ArrayBuffer, mimeType: string },
   *   subtitles?: Array<{ id: string, startTime: number, endTime: number, text: string }>,
   *   subtitleStyle?: { color: string, fontSize: number, fontFamily: string, outlineColor: string, outlineWidth: number },
   *   outputPath?: string
   * }} params
   * @returns {Promise<{ videoPath: string, mimeType: string }>}
   */
  async assembleVideo({ images, audio, subtitles, subtitleStyle, outputPath, targetDuration }) {
    console.log(`[VideoAssembler] assembleVideo called with ${images?.length || 0} images`);
    
    // CRITICAL: Video generation MUST be separate from subtitle generation
    // Subtitles are NEVER generated or burned during initial video creation
    if (subtitles && subtitles.length > 0) {
      console.warn(`[VideoAssembler] ⚠ WARNING: Subtitles provided but will be IGNORED during video assembly`);
      console.warn(`[VideoAssembler] ⚠ Video generation and subtitle generation are SEPARATE pipelines`);
      console.warn(`[VideoAssembler] ⚠ Use burnSubtitles() method separately to add subtitles to existing video`);
    }
    
    if (!images || images.length === 0) {
      throw new Error("At least one image is required for video assembly.");
    }
    if (!audio || !audio.audioData) {
      throw new Error("Audio data is required for video assembly.");
    }

    await this.#ensureOutputDir();

    const timestamp = Date.now();
    const imagePaths = [];
    let audioPath;
    let subtitleFileForCleanup = null; // Declare at function level for cleanup in catch block

    try {
      console.log("Assembling video from images and audio...");
      console.log(`- Images: ${images.length}`);
      
      // Write audio file
      audioPath = join(this.outputDir, `audio_${timestamp}.mp3`);
      await writeFile(audioPath, Buffer.from(audio.audioData));
      console.log("Audio file written:", audioPath);

      // Get audio duration first
      let audioDuration = await this.#getAudioDuration(audioPath);
      console.log(`Audio duration: ${audioDuration}s`);

      // Normalize paths for Windows (helper function)
      const normalizePath = (path) => resolve(path).replace(/\\/g, "/");

      // If target duration is specified, ensure audio matches it exactly
      if (targetDuration && targetDuration > 0) {
        if (audioDuration > targetDuration) {
          // Truncate audio if it's longer than target
          console.log(`Truncating audio from ${audioDuration.toFixed(2)}s to ${targetDuration}s to match target duration`);
          const truncatedAudioPath = join(this.outputDir, `audio_truncated_${timestamp}.mp3`);
          const truncateCmd = `ffmpeg -i "${normalizePath(audioPath)}" -t ${targetDuration} -c copy -y "${normalizePath(truncatedAudioPath)}"`;
          await execAsync(truncateCmd, { maxBuffer: 10 * 1024 * 1024 });
          audioPath = truncatedAudioPath;
          audioDuration = targetDuration;
          console.log(`Truncated audio duration: ${audioDuration}s`);
        } else if (audioDuration < targetDuration) {
          // Extend audio with silence if it's shorter than target
          const silenceDuration = targetDuration - audioDuration;
          console.log(`Audio is ${audioDuration.toFixed(2)}s, extending by ${silenceDuration.toFixed(2)}s to match target ${targetDuration}s`);
          const extendedAudioPath = join(this.outputDir, `audio_extended_${timestamp}.mp3`);
          // Pad audio with silence to match target duration
          const extendCmd = `ffmpeg -i "${normalizePath(audioPath)}" -af "apad=pad_dur=${silenceDuration}" -t ${targetDuration} -c:a libmp3lame -y "${normalizePath(extendedAudioPath)}"`;
          await execAsync(extendCmd, { maxBuffer: 10 * 1024 * 1024 });
          audioPath = extendedAudioPath;
          audioDuration = await this.#getAudioDuration(audioPath);
          console.log(`Extended audio duration: ${audioDuration.toFixed(2)}s (target: ${targetDuration}s)`);
        } else {
          console.log(`Audio duration (${audioDuration.toFixed(2)}s) matches target duration (${targetDuration}s) perfectly`);
        }
      }
      
      // Always use target duration if provided, ensuring video matches user's selection exactly
      const videoDuration = targetDuration && targetDuration > 0 
        ? targetDuration 
        : audioDuration;
      console.log(`Target duration: ${targetDuration || 'not specified'}s`);
      console.log(`Final video duration: ${videoDuration.toFixed(2)}s`);

      // Calculate duration per image (distribute video duration across all images)
      const durationPerImage = Math.max(2, videoDuration / images.length); // Minimum 2 seconds per image
      console.log(`Duration per image: ${durationPerImage.toFixed(2)}s`);

      // Write all images
      for (let i = 0; i < images.length; i++) {
        const ext = images[i].mimeType?.split("/")[1] || "png";
        const imagePath = join(this.outputDir, `image_${i}_${timestamp}.${ext}`);
        await writeFile(imagePath, Buffer.from(images[i].imageData, "base64"));
        imagePaths.push(imagePath);
      }
      console.log(`Wrote ${imagePaths.length} images`);

      // Normalize paths for Windows (reuse the function defined earlier)
      let videoPath = outputPath || join(this.outputDir, `video_${timestamp}.mp4`);
      const videoPathNormalized = normalizePath(videoPath);
      const audioPathNormalized = normalizePath(audioPath);

      // Create a simple slideshow: loop each image and concat
      // Use a simpler approach: create individual video segments then concat
      const videoSegments = [];
      
      for (let i = 0; i < imagePaths.length; i++) {
        const segmentPath = join(this.outputDir, `segment_${i}_${timestamp}.mp4`);
        const segmentPathNormalized = normalizePath(segmentPath);
        const imgPathNormalized = normalizePath(imagePaths[i]);
        
        // Create a video segment from each image
        const segmentCmd = `ffmpeg -loop 1 -i "${imgPathNormalized}" -t ${durationPerImage.toFixed(2)} -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -pix_fmt yuv420p -r 30 -y "${segmentPathNormalized}"`;
        
        console.log(`Creating segment ${i + 1}/${imagePaths.length}...`);
        try {
          const segResult = await execAsync(segmentCmd, { maxBuffer: 10 * 1024 * 1024 });
          // Check for errors
          if (segResult.stderr) {
            const stderrLower = segResult.stderr.toLowerCase();
            if (stderrLower.includes("error") && !stderrLower.includes("frame=") && !stderrLower.includes("size=")) {
              console.warn(`Warning in segment ${i}: ${segResult.stderr.split('\n').filter(l => l.toLowerCase().includes('error'))[0]}`);
            }
          }
          if (existsSync(segmentPath)) {
            videoSegments.push(segmentPath);
          } else {
            throw new Error(`Segment ${i} was not created`);
          }
        } catch (segError) {
          console.error(`Failed to create segment ${i}:`, segError.message);
          throw new Error(`Failed to create video segment ${i + 1}/${imagePaths.length}: ${segError.message}`);
        }
      }

      // Create concat file for segments
      const concatFile = join(this.outputDir, `concat_${timestamp}.txt`);
      const concatContent = videoSegments.map(seg => `file '${normalizePath(seg)}'`).join("\n");
      await writeFile(concatFile, concatContent);
      const concatFileNormalized = normalizePath(concatFile);

      // Concatenate all video segments
      const videoOnlyPath = join(this.outputDir, `video_only_${timestamp}.mp4`);
      const videoOnlyPathNormalized = normalizePath(videoOnlyPath);
      
      console.log("Concatenating video segments...");
      const concatCmd = `ffmpeg -f concat -safe 0 -i "${concatFileNormalized}" -c copy -y "${videoOnlyPathNormalized}"`;
      await execAsync(concatCmd, { maxBuffer: 10 * 1024 * 1024 });

      // CRITICAL: Video generation pipeline - NO subtitles
      // Subtitles are NEVER generated or burned during initial video creation
      // Video is exported WITHOUT subtitles and marked as FINAL
      // Use burnSubtitles() method separately to add subtitles to existing video
      
      // IGNORE subtitles during video assembly - they will be handled separately
      if (subtitles && subtitles.length > 0) {
        console.log(`[VideoAssembler] ⚠ IGNORING ${subtitles.length} subtitles during video assembly (separate pipeline)`);
        console.log(`[VideoAssembler] ⚠ Video will be exported WITHOUT subtitles`);
        console.log(`[VideoAssembler] ⚠ Use burnSubtitles() method separately to add subtitles`);
      }
      
      // REMOVED: All subtitle processing code - moved to separate subtitle pipeline
      // Video generation pipeline: images + audio → video WITHOUT subtitles
      // Subtitles are handled separately via generateSubtitles() and burnSubtitles() methods
      
      // VIDEO GENERATION PIPELINE: Combine video with audio ONLY (NO subtitles)
      console.log("Combining video with audio (NO subtitles - separate pipeline)...");
      
      // Simple video + audio combination - NO subtitle processing
      const finalCmd = `ffmpeg -i "${videoOnlyPathNormalized}" -i "${audioPathNormalized}" -c:v copy -c:a aac -shortest -y "${videoPathNormalized}"`;
      
      console.log(`[VideoAssembler] ✓ Video generation pipeline: images + audio → video WITHOUT subtitles`);
      console.log(`[VideoAssembler] ✓ Video marked as FINAL (no subtitles)`);
      console.log(`[VideoAssembler] ✓ Use burnSubtitles() method separately to add subtitles`);
      
      const execOptions = { maxBuffer: 10 * 1024 * 1024 };
      
      console.log("[VideoAssembler] Executing FFmpeg command...");
      console.log("[VideoAssembler] Working directory:", execOptions.cwd || "current");
      const result = await execAsync(finalCmd, execOptions);

      // Check for errors in stderr
      if (result.stderr) {
        const stderrLower = result.stderr.toLowerCase();
        if (stderrLower.includes("error") && !stderrLower.includes("frame=") && !stderrLower.includes("size=")) {
          console.error("[VideoAssembler] FFmpeg error:", result.stderr);
          throw new Error(`FFmpeg failed: ${result.stderr.split('\n').filter(l => l.toLowerCase().includes('error') && !l.toLowerCase().includes('deprecated'))[0] || 'Unknown error'}`);
        } else {
          const progressLines = result.stderr.split('\n').filter(l => l.includes('frame=') || l.includes('time=')).slice(-10);
          console.log("[VideoAssembler] FFmpeg progress:", progressLines.join('\n'));
        }
      }

      // Verify video was created
      if (!existsSync(videoPath)) {
        throw new Error(`Video file was not created at ${videoPath}`);
      }

      const videoStats = await import("fs/promises").then(fs => fs.stat(videoPath));
      console.log(`[VideoAssembler] ✓ Video created successfully: ${videoStats.size} bytes`);
      console.log(`[VideoAssembler] ✓ Video marked as FINAL (no subtitles)`);
      console.log(`[VideoAssembler] ✓ Use burnSubtitles() method separately to add subtitles`);

      // Cleanup temporary files
      const cleanupFiles = [
        ...imagePaths.map((p) => unlink(p).catch(() => {})),
        ...videoSegments.map((p) => unlink(p).catch(() => {})),
        unlink(audioPath).catch(() => {}),
        unlink(concatFile).catch(() => {}),
        unlink(videoOnlyPath).catch(() => {}),
      ];
      
      await Promise.all(cleanupFiles);

      return {
        videoPath,
        mimeType: "video/mp4",
      };
    } catch (error) {
      console.error("Video assembly error:", error);
      
      // Cleanup on error
      const cleanupPromises = [
        ...imagePaths.map((p) => unlink(p).catch(() => {})),
      ];
      if (typeof audioPath !== "undefined") cleanupPromises.push(unlink(audioPath).catch(() => {}));
      
      // Clean up any segment files that might have been created
      for (let i = 0; i < (images?.length || 0); i++) {
        const segmentPath = join(this.outputDir, `segment_${i}_${timestamp}.mp4`);
        cleanupPromises.push(unlink(segmentPath).catch(() => {}));
      }
      
      const concatFile = join(this.outputDir, `concat_${timestamp}.txt`);
      const videoOnlyPath = join(this.outputDir, `video_only_${timestamp}.mp4`);
      cleanupPromises.push(unlink(concatFile).catch(() => {}));
      cleanupPromises.push(unlink(videoOnlyPath).catch(() => {}));
      
      await Promise.all(cleanupPromises).catch(() => {});

      if (error.code === "ENOENT") {
        throw new Error(
          "FFmpeg not found. Please install FFmpeg and ensure it's in your PATH. Visit https://ffmpeg.org/download.html for installation instructions."
        );
      }
      
      const errorMsg = error.message || String(error);
      throw new Error(`Video assembly failed: ${errorMsg}`);
    }
  }

  /**
   * Format time in seconds to ASS time format (H:MM:SS.mm)
   * @private
   */
  #formatAssTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centiseconds = Math.floor((seconds % 1) * 100);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }

  /**
   * Get image dimensions.
   * @private
   */
  async #getImageDimensions(imagePath) {
    try {
      // Use ffprobe with image2 demuxer for images
      const normalizedPath = resolve(imagePath).replace(/\\/g, "/");
      const { stdout } = await execAsync(
        `ffprobe -v error -f image2 -select_streams v:0 -show_entries stream=width,height -of default=noprint_wrappers=1 "${normalizedPath}"`,
        { maxBuffer: 1024 * 1024 }
      );
      const match = stdout.match(/width=(\d+)\s+height=(\d+)/);
      if (match) {
        return { width: parseInt(match[1]), height: parseInt(match[2]) };
      }
    } catch (error) {
      console.warn("Could not detect image dimensions:", error.message);
      // Fallback to standard dimensions
    }
    return { width: 1920, height: 1080 }; // Default 1080p
  }

  /**
   * Generate subtitle file from word timestamps.
   * @param {{
   *   wordTimestamps: Array<{ word: string, startTime: number, endTime: number }>,
   *   audioDuration: number,
   *   subtitleStyle?: { color: string, fontSize: number, fontFamily: string, outlineColor: string, outlineWidth: number },
   *   outputPath?: string
   * }} params
   * @returns {Promise<{ subtitlePath: string }>}
   */
  async generateSubtitles({ wordTimestamps, audioDuration, subtitleStyle, outputPath }) {
    if (!wordTimestamps || wordTimestamps.length === 0) {
      throw new Error("Word timestamps are required for subtitle generation.");
    }

    await this.#ensureOutputDir();

    const timestamp = Date.now();
    const subtitlePath = outputPath || join(this.outputDir, `subtitles_${timestamp}.ass`);
    
    const style = subtitleStyle || {
      color: "#FFFFFF",
      fontSize: 20,
      fontFamily: "Arial",
      outlineColor: "#000000",
      outlineWidth: 2,
    };

    // Process word timestamps: clamp to audio duration and filter invalid entries
    const processedWords = wordTimestamps
      .map((word, index) => ({
        id: `word-${index}`,
        word: word.word.trim(),
        startTime: Math.max(0, word.startTime),
        endTime: Math.min(audioDuration, word.endTime),
      }))
      .filter(word => word.startTime < audioDuration && word.endTime > word.startTime)
      .filter(word => (word.endTime - word.startTime) <= 2.5) // Filter unreasonably long words
      .map(word => {
        // Fix invalid long words
        if (word.endTime - word.startTime > 2.5) {
          word.endTime = word.startTime + 0.8;
        }
        return word;
      });

    // Group words into subtitle lines (4-6 words per line)
    const lines = [];
    let currentLine = [];
    const minWordsPerLine = 4;
    const maxWordsPerLine = 6;

    for (const word of processedWords) {
      currentLine.push(word);
      
      if (currentLine.length >= minWordsPerLine) {
        const lastWord = currentLine[currentLine.length - 1];
        const isSentenceEnd = lastWord.word.match(/[.!?]$/);
        
        if (currentLine.length >= maxWordsPerLine || (isSentenceEnd && currentLine.length >= minWordsPerLine)) {
          lines.push(currentLine);
          currentLine = [];
        }
      }
    }

    // Add remaining words
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // Convert lines to ASS format
    const assContent = this.#generateAssFile(lines, style);

    // Write ASS file
    await writeFile(subtitlePath, assContent, "utf-8");
    console.log(`[VideoAssembler] ✓ Generated subtitle file: ${subtitlePath}`);
    console.log(`[VideoAssembler] ✓ Created ${lines.length} subtitle lines from ${processedWords.length} words`);

    return { subtitlePath };
  }

  /**
   * Burn subtitles into an existing video file.
   * @param {{
   *   videoPath: string,
   *   subtitlePath: string,
   *   outputPath?: string
   * }} params
   * @returns {Promise<{ videoPath: string, mimeType: string }>}
   */
  async burnSubtitles({ videoPath, subtitlePath, outputPath }) {
    if (!existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    if (!existsSync(subtitlePath)) {
      throw new Error(`Subtitle file not found: ${subtitlePath}`);
    }

    await this.#ensureOutputDir();

    const timestamp = Date.now();
    const outputVideoPath = outputPath || join(this.outputDir, `video_with_subs_${timestamp}.mp4`);

    // Normalize paths for Windows compatibility
    const normalizePath = (path) => resolve(path).replace(/\\/g, "/");
    const videoPathNormalized = normalizePath(videoPath);
    const outputPathNormalized = normalizePath(outputVideoPath);

    // CRITICAL (Windows): ffmpeg subtitles filter breaks on absolute paths like C:/... due to ':' parsing.
    // Use the subtitle filename with cwd set to the subtitle directory.
    const subtitleDir = dirname(subtitlePath);
    const subtitleFile = basename(subtitlePath);
    
    console.log(`[VideoAssembler] Burning subtitles into video...`);
    console.log(`[VideoAssembler] Video: ${videoPathNormalized}`);
    console.log(`[VideoAssembler] Subtitles file: ${subtitleFile}`);
    console.log(`[VideoAssembler] Subtitles cwd: ${subtitleDir}`);

    // FFmpeg command to burn subtitles (must re-encode video when using filters)
    // Force yuv420p for broad compatibility. Also set charenc to handle UTF-8 text (Swahili etc.).
    const burnCmd =
      `ffmpeg -i "${videoPathNormalized}" ` +
      `-vf "subtitles='${subtitleFile}':charenc=UTF-8" ` +
      `-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p ` +
      `-c:a aac -b:a 192k -shortest -y "${outputPathNormalized}"`;
    
    try {
      const { stderr } = await execAsync(burnCmd, { 
        maxBuffer: 10 * 1024 * 1024,
        cwd: subtitleDir, // make subtitleFile resolvable without C:/ prefix
      });
      if (stderr) {
        console.log("[VideoAssembler] FFmpeg burn stderr (last 800 chars):", String(stderr).slice(-800));
      }
      
      console.log(`[VideoAssembler] ✓ Subtitles burned successfully: ${outputVideoPath}`);
      
      return {
        videoPath: outputVideoPath,
        mimeType: "video/mp4",
      };
    } catch (error) {
      console.error("[VideoAssembler] Error burning subtitles:", error);
      throw new Error(`Failed to burn subtitles: ${error.message}`);
    }
  }

  /**
   * Generate ASS subtitle file content from lines.
   * @private
   */
  #generateAssFile(lines, style) {
    const assLines = [];
    
    // ASS Header
    assLines.push("[Script Info]");
    assLines.push("Title: Video Subtitles");
    assLines.push("ScriptType: v4.00+");
    // Prevent libass defaulting to a tiny PlayRes (e.g. 384x288) which can make burned subs invisible/tiny.
    assLines.push("PlayResX: 1920");
    assLines.push("PlayResY: 1080");
    assLines.push("WrapStyle: 2");
    assLines.push("ScaledBorderAndShadow: yes");
    assLines.push("");
    assLines.push("[V4+ Styles]");
    assLines.push("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding");
    
    // Convert hex color to ASS format (&HBBGGRR&)
    const hexToAssColor = (hex) => {
      const rgb = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
      if (!rgb) return "&H00FFFFFF&";
      const r = parseInt(rgb[1], 16);
      const g = parseInt(rgb[2], 16);
      const b = parseInt(rgb[3], 16);
      return `&H${b.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}&`;
    };

    const primaryColor = hexToAssColor(style.color);
    const outlineColor = hexToAssColor(style.outlineColor);
    
    // Move subtitles slightly upward by increasing MarginV (distance from bottom for Alignment=2)
    assLines.push(`Style: Default,${style.fontFamily},${style.fontSize},${primaryColor},${primaryColor},${outlineColor},&H00000000,0,0,0,0,100,100,0,0,1,${style.outlineWidth},0,2,10,10,60,1`);
    assLines.push("");
    assLines.push("[Events]");
    assLines.push("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text");
    
    // Add subtitle events
    for (const line of lines) {
      if (line.length === 0) continue;
      
      const startTime = line[0].startTime;
      const endTime = line[line.length - 1].endTime;
      const text = line.map(w => w.word).join(" ");
      
      assLines.push(`Dialogue: 0,${this.#formatAssTime(startTime)},${this.#formatAssTime(endTime)},Default,,0,0,0,,${text}`);
    }

    return assLines.join("\n");
  }
}

export default VideoAssembler;
