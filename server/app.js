import express from "express";
import cors from "cors";
import { z } from "zod";
import { featuredVideoDb, userDb, userPlanDb, planDb, videoDb, audioDb } from "./db.js";
import { authenticate, requireAdmin, generateToken } from "./auth.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { OAuth2Client } from "google-auth-library";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for video uploads
const uploadsDir = path.join(__dirname, "../uploads/featured-videos");
// Ensure uploads directory exists
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `video-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"), false);
    }
  },
});

const storySchema = z.object({
  title: z.string().min(1, "Title is required"),
  language: z.string().min(1, "Language is required"),
  minutes: z.number().min(0.5), // Allow floats (0.5 = 30 seconds, 1 = 60 seconds) - REMOVED .int() to accept floats
  summary: z.string().optional(),
  genre: z.string().optional(),
  ageRange: z.string().optional(),
  setting: z.string().optional(),
  theme: z.string().optional(),
  pacing: z.string().optional(),
});

// Verify schema accepts floats - test with a sample payload
try {
  storySchema.parse({ title: "Test", language: "en", minutes: 0.5 });
  console.log("[Schema] ✓ Story schema correctly accepts float minutes (0.5)");
} catch (e) {
  console.error("[Schema] ✗ Story schema validation failed:", e.message);
}

const scenesSchema = z.object({
  story: z.string().min(1, "Story text is required"),
  minScenes: z.number().int().positive().default(5),
  maxScenes: z.number().int().positive().default(10),
  imageStyle: z.string().optional().default("realistic"),
});

const narrationSchema = z.object({
  story: z.string().min(1, "Story text is required"),
  language: z.string().min(1).default("English"),
  tone: z.string().min(1).default("warm"),
});

const imageSchema = z.object({
  prompt: z.string().min(1, "Image prompt is required"),
  aspectRatio: z.string().optional().default("16:9"),
  safetyFilterLevel: z.string().optional().default("block_none"), // Allow all content
});

const imagesSchema = z.object({
  prompts: z.array(z.string().min(1)).min(1, "At least one prompt is required"),
  aspectRatio: z.string().optional().default("16:9"),
  safetyFilterLevel: z.string().optional().default("block_none"), // Allow all content
  style: z.string().optional(), // For Leonardo AI style
});

const ttsSchema = z.object({
  text: z.string().min(1, "Text is required for TTS"),
  language: z.string().optional().default("en-US"),
  voice: z.string().optional(),
  speed: z.number().optional().default(1.0),
});

const videoSchema = z.object({
  images: z
    .array(
      z.object({
        imageData: z.string().min(1),
        mimeType: z.string().optional().default("image/png"),
        duration: z.number().optional(),
      })
    )
    .min(1),
  audio: z.object({
    audioData: z.string().min(1), // Base64 encoded
    mimeType: z.string().optional().default("audio/mpeg"),
  }),
  subtitles: z
    .array(
      z.object({
        id: z.string(),
        startTime: z.number(),
        endTime: z.number(),
        text: z.string(),
      })
    )
    .optional(),
  subtitleStyle: z
    .object({
      color: z.string().optional(),
      fontSize: z.number().optional(),
      fontFamily: z.string().optional(),
      outlineColor: z.string().optional(),
      outlineWidth: z.number().optional(),
    })
    .optional(),
  targetDuration: z.number().optional(),
});

export function createServer(services) {
  const app = express();
  
  // CORS configuration - allow specific origins in production
  const corsOptions = {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : process.env.NODE_ENV === 'production'
        ? [] // In production, CORS_ORIGIN must be set
        : true, // In development, allow all origins
    credentials: true,
    optionsSuccessStatus: 200
  };
  
  app.use(cors(corsOptions));
  
  // Skip JSON parsing for multipart/form-data requests on upload routes
  // Increase body size limit for endpoints that handle base64 images/audio
  app.use((req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (req.path.includes("/admin/featured-videos/upload") || contentType.includes("multipart/form-data")) {
      return next();
    }
    // Use larger limits for endpoints that handle base64-encoded media
    let limit = "10mb"; // Default limit
    if (req.path.includes("/video/assemble")) {
      limit = "50mb"; // Video assembly: multiple images + audio (base64)
    } else if (req.path.includes("/video/transcribe") || req.path.includes("/api/video/transcribe")) {
      limit = "200mb"; // Video transcription: full video file (base64) - can be large for longer videos
    } else if (req.path.includes("/videos/save")) {
      limit = "50mb"; // Video save: base64-encoded video data
    } else if (req.path.includes("/images/generate-batch")) {
      limit = "20mb"; // Batch image generation: multiple base64 images
    } else if (req.path.includes("/tts/generate")) {
      limit = "5mb"; // TTS: base64 audio response
    }
    
    // Wrap JSON parser with error handling to catch malformed JSON
    express.json({ limit })(req, res, (err) => {
      if (err) {
        console.error("[Body Parser] JSON parsing error:", err);
        console.error("[Body Parser] Error details:", {
          message: err.message,
          type: err.type,
          path: req.path,
          contentType: req.headers["content-type"],
          bodyLength: req.headers["content-length"]
        });
        return res.status(400).json({
          error: "Invalid JSON in request body",
          message: err.message || "Failed to parse JSON. The request body may contain invalid characters or be malformed."
        });
      }
      next();
    });
  });
  
  // Serve static files from uploads directory
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
  
  // Serve static files from images directory (for thumbnails)
  // This serves both static category images and dynamically generated thumbnails
  const imagesDir = path.join(__dirname, "../web/public/images");
  app.use("/images", express.static(imagesDir));
  
  // Also serve images from /api/images for compatibility
  app.use("/api/images", express.static(imagesDir));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Public endpoint to get featured videos
  app.get("/api/featured-videos", (_req, res) => {
    try {
      const videos = featuredVideoDb.findAll(100);
      res.json({ videos });
    } catch (error) {
      console.error("Error fetching featured videos:", error);
      res.status(500).json({ error: "Failed to fetch featured videos" });
    }
  });

  // Authentication routes
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, name } = z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        name: z.string().min(1, "Name is required"),
      }).parse(req.body);

      const existingUser = userDb.findByEmail(email.toLowerCase().trim());
      if (existingUser) {
        return res.status(400).json({ error: "User already exists", message: "An account with this email already exists" });
      }

      const userId = userDb.create(email.toLowerCase().trim(), password, name.trim());
      const token = generateToken(userId);
      const user = userDb.findById(userId);

      if (!user) {
        return res.status(500).json({ error: "Registration failed", message: "Failed to create user account" });
      }

      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role || "user" } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
        return res.status(400).json({ error: "ValidationError", message: errorMessages, details: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const { email, password } = z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      }).parse(req.body);

      const user = userDb.findByEmail(email.toLowerCase().trim());
      if (!user || !user.password_hash) {
        return res.status(401).json({ error: "Invalid credentials", message: "Invalid email or password" });
      }

      if (!userDb.verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: "Invalid credentials", message: "Invalid email or password" });
      }

      // Check if account is active (default to active if is_active is null/undefined)
      if (user.is_active !== undefined && user.is_active !== null && user.is_active === 0) {
        return res.status(403).json({ error: "Account is deactivated", message: "Your account has been deactivated. Please contact support." });
      }

      const token = generateToken(user.id);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role || "user" } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
        return res.status(400).json({ error: "ValidationError", message: errorMessages, details: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/auth/google", async (req, res, next) => {
    try {
      const { credential } = z.object({
        credential: z.string(),
      }).parse(req.body);

      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: "Google OAuth not configured" });
      }

      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        return res.status(400).json({ error: "Invalid Google token" });
      }

      let user = userDb.findByGoogleId(payload.sub);
      if (!user) {
        user = userDb.findByEmail(payload.email);
        if (user) {
          userDb.updateGoogleId(user.id, payload.sub);
        } else {
          const userId = userDb.createGoogleUser(payload.email, payload.name || payload.email, payload.sub);
          user = userDb.findById(userId);
        }
      }

      if (user.is_active === 0) {
        return res.status(403).json({ error: "Account is deactivated" });
      }

      const token = generateToken(user.id);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role || "user" } });
    } catch (error) {
      console.error("Google auth error:", error);
      next(error);
    }
  });

  app.get("/api/auth/me", authenticate, (req, res) => {
    res.json({ user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role || "user" } });
  });

  app.post("/api/story", async (req, res, next) => {
    try {
      console.log("[Story API] Received request:", { 
        title: req.body?.title, 
        language: req.body?.language, 
        minutes: req.body?.minutes,
        minutesType: typeof req.body?.minutes,
        minutesValue: req.body?.minutes,
        hasSummary: !!req.body?.summary 
      });
      
      // Log schema definition for debugging
      console.log("[Story API] Schema minutes type check:", storySchema.shape.minutes._def.typeName);
      
      const payload = storySchema.parse(req.body);
      console.log("[Story API] Validated payload:", payload);
      
      console.log("[Story API] Calling story.generate...");
      const story = await services.story.generate(payload);
      
      if (!story || typeof story !== 'string' || story.trim().length === 0) {
        console.error("[Story API] Generated story is empty or invalid");
        return res.status(500).json({ 
          error: "StoryGenerationError", 
          message: "Generated story is empty. Please try again." 
        });
      }
      
      console.log(`[Story API] Story generated successfully (${story.length} characters)`);
      res.json({ story });
    } catch (error) {
      // Safely log error - handle cases where error might be undefined or not an Error object
      const errorMessage = error?.message || String(error) || "Unknown error";
      const errorStack = error?.stack || "No stack trace available";
      console.error("[Story API] Error generating story:", errorMessage);
      console.error("[Story API] Error stack:", errorStack);
      
      // Provide more specific error messages
      if (error instanceof z.ZodError) {
        console.error("[Story API] Validation error details:", error.issues);
        return res.status(400).json({
          error: "ValidationError",
          details: error.issues,
          message: "Invalid request parameters"
        });
      }
      
      // Check for common API errors
      const errorMsg = error?.message || String(error) || "";
      if (errorMsg.includes("API key") || errorMsg.includes("GOOGLE_API_KEY")) {
        console.error("[Story API] API key error detected");
        return res.status(500).json({
          error: "ConfigurationError",
          message: "Google API key is missing or invalid. Please check server configuration."
        });
      }
      
      if (errorMsg.includes("timeout")) {
        return res.status(504).json({
          error: "TimeoutError",
          message: errorMsg || "Story generation timed out. Please try again with a shorter duration."
        });
      }
      
      // Handle PROHIBITED_CONTENT errors specifically
      if (errorMsg.includes("PROHIBITED_CONTENT") || 
          errorMsg.includes("blocked by safety filters")) {
        console.error("[Story API] Safety filter block detected");
        return res.status(400).json({
          error: "SafetyFilterError",
          message: errorMsg || "The content was blocked by safety filters. PROHIBITED_CONTENT cannot be overridden. Please try a different title or modify your story summary to avoid potentially sensitive topics."
        });
      }
      
      // Ensure error is passed safely
      next(error || new Error(errorMessage));
    }
  });

  app.post("/api/scenes", async (req, res, next) => {
    try {
      const payload = scenesSchema.parse({
        ...req.body,
        minScenes: Number(req.body?.minScenes ?? 5),
        maxScenes: Number(req.body?.maxScenes ?? 10),
        imageStyle: req.body?.imageStyle || "realistic",
      });
      
      console.log(`[Scenes API] Generating scenes from story (${payload.story.length} chars), ${payload.minScenes}-${payload.maxScenes} scenes, style: ${payload.imageStyle}`);
      
      const startTime = Date.now();
      const scenes = await services.scenes.generate(payload);
      const duration = Date.now() - startTime;
      
      console.log(`[Scenes API] Generated ${scenes.length} scenes in ${duration}ms`);
      
      // Validate scenes can be serialized to JSON before sending
      try {
        JSON.stringify(scenes);
      } catch (serializeError) {
        console.error("[Scenes API] Failed to serialize scenes to JSON:", serializeError);
        return res.status(500).json({
          error: "SceneGenerationError",
          message: `Failed to serialize scenes: ${serializeError.message}. This may indicate invalid data in the generated scenes.`
        });
      }
      
      res.json({ scenes });
    } catch (error) {
      console.error("[Scenes API] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "ValidationError",
          details: error.issues,
        });
      }
      const errorMessage = error.message || "Scene generation failed";
      res.status(500).json({ 
        error: "SceneGenerationError",
        message: errorMessage 
      });
    }
  });

  app.post("/api/narration", async (req, res, next) => {
    try {
      const payload = narrationSchema.parse(req.body);
      const narration = await services.narration.generate(payload);
      res.json({ narration });
    } catch (error) {
      console.error("[Narration API] Error:", error);
      
      // Handle PROHIBITED_CONTENT errors specifically
      if (error.message?.includes("PROHIBITED_CONTENT") || 
          error.message?.includes("blocked by safety filters")) {
        console.error("[Narration API] Safety filter block detected");
        return res.status(400).json({
          error: "SafetyFilterError",
          message: error.message || "Narration generation was blocked by safety filters. PROHIBITED_CONTENT cannot be overridden. Please try a different story or modify your content to avoid potentially sensitive topics."
        });
      }
      
      next(error);
    }
  });

  app.post("/api/images/generate", async (req, res, next) => {
    try {
      const payload = imageSchema.parse(req.body);
      const result = await services.images.generate(payload);
      res.json(result);
    } catch (error) {
      // Handle Leonardo AI content moderation errors specifically
      if (error.message?.includes("PROHIBITED_CONTENT") || 
          error.message?.includes("Content blocked by safety filters")) {
        console.error("[Image API] Leonardo AI content moderation block detected");
        return res.status(400).json({
          error: "SafetyFilterError",
          message: error.message || "Image generation was blocked by Leonardo AI's server-side content moderation. This cannot be disabled via API. Please try with a different prompt or rephrase your content.",
          provider: "leonardo",
        });
      }
      next(error);
    }
  });

  app.post("/api/images/generate-batch", async (req, res, next) => {
    try {
      const payload = imagesSchema.parse(req.body);
      const results = await services.images.generateBatch(payload);
      res.json({ images: results });
    } catch (error) {
      // Handle Leonardo AI content moderation errors specifically
      if (error.message?.includes("PROHIBITED_CONTENT") || 
          error.message?.includes("Content blocked by safety filters")) {
        console.error("[Image API] Leonardo AI content moderation block detected");
        return res.status(400).json({
          error: "SafetyFilterError",
          message: error.message || "Image generation was blocked by Leonardo AI's server-side content moderation. This cannot be disabled via API. Please try with a different prompt or rephrase your content.",
          provider: "leonardo",
        });
      }
      next(error);
    }
  });

  app.post("/api/tts/transcribe", async (req, res, next) => {
    try {
      const { audioData, mimeType, language } = req.body;
      
      if (!audioData) {
        return res.status(400).json({ error: "Audio data is required." });
      }

      const words = await services.speechToText.transcribe({ 
        audioData: Buffer.from(audioData, "base64"), 
        mimeType: mimeType || "audio/mpeg",
        language: language || "en-US"
      });
      
      res.json({ words });
    } catch (error) {
      console.error("[Speech-to-Text API] Error:", error);
      next(error);
    }
  });

  // Transcribe audio FROM the generated video (extract audio with FFmpeg, then run STT)
  app.post("/api/video/transcribe", async (req, res, next) => {
    try {
      const schema = z.object({
        videoData: z.string().min(1), // base64 mp4
        videoMimeType: z.string().optional().default("video/mp4"),
        language: z.string().optional().default("en-US"),
      });
      const payload = schema.parse(req.body);

      const videoBuffer = Buffer.from(payload.videoData, "base64");
      if (videoBuffer.length < 1000) {
        return res.status(400).json({ error: "Video data is too small." });
      }

      const tempDir = path.join(__dirname, "../temp/videos");
      await fs.mkdir(tempDir, { recursive: true });

      const stamp = Date.now();
      const videoPath = path.join(tempDir, `stt_video_${stamp}.mp4`);
      const wavPath = path.join(tempDir, `stt_audio_${stamp}.wav`);

      await fs.writeFile(videoPath, videoBuffer);

      // Extract audio as 16kHz mono WAV for reliable STT word timing
      const cmd = `ffmpeg -i "${videoPath}" -vn -ac 1 -ar 16000 -f wav -y "${wavPath}"`;
      console.log("[Video Transcribe] Extracting audio from video via FFmpeg...");
      await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });

      const audioBuf = await fs.readFile(wavPath);
      console.log(`[Video Transcribe] Extracted WAV: ${audioBuf.length} bytes`);

      const words = await services.speechToText.transcribe({
        audioData: audioBuf,
        mimeType: "audio/wav",
        language: payload.language,
      });

      // Cleanup
      await fs.unlink(videoPath).catch(() => {});
      await fs.unlink(wavPath).catch(() => {});

      res.json({ words });
    } catch (error) {
      console.error("[Video Transcribe] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "ValidationError", details: error.issues });
      }
      next(error);
    }
  });

  app.post("/api/tts/generate", authenticate, async (req, res, next) => {
    try {
      const payload = ttsSchema.parse(req.body);
      const user = req.user;
      
      // Check if this is audio-only generation (requires payment)
      const isAudioOnly = req.body.audioOnly === true;
      const estimatedDurationMinutes = req.body.estimatedDurationMinutes || 0.5; // Default 30 seconds
      
      if (isAudioOnly) {
        // Audio-only generation requires credits
        // Pricing: 1 credit per minute of audio (minimum 1 credit for any audio)
        const creditsPerMinute = 1;
        const creditsRequired = Math.max(1, Math.ceil(estimatedDurationMinutes * creditsPerMinute));
        
        // Check user credits
        const userCredits = userPlanDb.getUserCredits(user.id);
        if (userCredits < creditsRequired) {
          return res.status(402).json({ 
            error: "Insufficient credits", 
            message: `You need ${creditsRequired} credits to generate ${estimatedDurationMinutes.toFixed(2)} minutes of audio. You have ${userCredits} credits.`,
            creditsRequired,
            creditsAvailable: userCredits
          });
        }
        
        console.log(`[TTS API] Audio-only generation requested: ${estimatedDurationMinutes.toFixed(2)} minutes, ${creditsRequired} credits required`);
      }
      
      const result = await services.tts.generate(payload);
      
      // NOTE: Subtitle generation is on-demand (triggered by user clicking "Generate Subtitles").
      // We do NOT fail TTS generation if Speech-to-Text is unavailable.
      console.log("[TTS API] Audio generated successfully. Speech-to-Text transcription is available via /api/tts/transcribe (on-demand).");
      console.log(`[TTS API] Audio size: ${Buffer.from(result.audioData).length} bytes, Language: ${payload.language || "en"}`);
      
      let wordTimestamps;
      try {
        // TTS now returns audioData as a Buffer directly
        // Ensure it's a Buffer for Speech-to-Text API
        const audioBuffer = result.audioData instanceof Buffer 
          ? result.audioData 
          : Buffer.from(result.audioData);
        
        console.log(`[TTS API] Audio buffer size: ${audioBuffer.length} bytes (${(audioBuffer.length / 1024).toFixed(2)} KB)`);
        console.log(`[TTS API] Audio buffer type: ${audioBuffer.constructor.name}`);
        
        if (audioBuffer.length < 100) {
          throw new Error(`Audio buffer is too small (${audioBuffer.length} bytes). Audio generation may have failed.`);
        }
        
        // CRITICAL: Ensure language code is passed correctly for transcription
        // The language must match the audio language for accurate transcription
        const transcriptionLanguage = payload.language || "en";
        console.log(`[TTS API] ⚠ CRITICAL: Transcribing audio with language: "${transcriptionLanguage}"`);
        console.log(`[TTS API] ⚠ This language MUST match the audio language for accurate transcription`);
        
        wordTimestamps = await services.speechToText.transcribe({
          audioData: audioBuffer,
          mimeType: result.mimeType,
          language: transcriptionLanguage, // Use the language from the TTS request
        });
        
        console.log(`[TTS API] ⚠ Transcription completed with language: "${transcriptionLanguage}"`);
        console.log(`[TTS API] ⚠ If transcription is wrong, check that language code matches audio language`);
        
        if (!wordTimestamps || wordTimestamps.length === 0) {
          throw new Error("Speech-to-Text API returned empty word timestamps");
        }
        
        console.log(`[TTS API] ✓✓✓ SUCCESS: Extracted ${wordTimestamps.length} word timestamps from Speech-to-Text API`);
        console.log(`[TTS API] Language used for transcription: ${payload.language || "en"}`);
        console.log(`[TTS API] First word: "${wordTimestamps[0].word}" at ${wordTimestamps[0].startTime.toFixed(3)}s - ${wordTimestamps[0].endTime.toFixed(3)}s`);
        console.log(`[TTS API] Last word: "${wordTimestamps[wordTimestamps.length - 1].word}" at ${wordTimestamps[wordTimestamps.length - 1].startTime.toFixed(3)}s - ${wordTimestamps[wordTimestamps.length - 1].endTime.toFixed(3)}s`);
        
        // Log all words for verification
        const allWords = wordTimestamps.map(w => w.word || w.text).join(' ');
        console.log(`[TTS API] All transcribed words: "${allWords}"`);
        console.log(`[TTS API] Original TTS text (first 200 chars): "${(payload.text || '').substring(0, 200)}"`);
        console.log(`[TTS API] Original TTS text length: ${payload.text?.length || 0} characters`);
        console.log(`[TTS API] Transcribed words count: ${wordTimestamps.length}`);
        
        // Verify transcription matches original text
        if (payload.text) {
          const originalWords = payload.text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
          const transcribedWords = wordTimestamps.map(w => (w.word || w.text || '').toLowerCase().trim()).filter(w => w.length > 0);
          console.log(`[TTS API] Original text word count: ${originalWords.length}`);
          console.log(`[TTS API] Transcribed word count: ${transcribedWords.length}`);
          
          // Check if transcription seems reasonable
          if (transcribedWords.length < originalWords.length * 0.5) {
            console.warn(`[TTS API] ⚠ WARNING: Transcription has significantly fewer words than original text!`);
            console.warn(`[TTS API] This might indicate a transcription error or language mismatch.`);
            console.warn(`[TTS API] Original: ${originalWords.length} words, Transcribed: ${transcribedWords.length} words`);
          }
        }
      } catch (transcribeError) {
        console.warn("[TTS API] Speech-to-Text transcription failed (will still return audio):", transcribeError?.message || transcribeError);
        wordTimestamps = undefined;
      }
      
      // Calculate actual duration from audio
      let actualDurationMinutes = estimatedDurationMinutes || 0.5;
      if (result.duration) {
        actualDurationMinutes = result.duration / 60; // Convert seconds to minutes
      }
      
      // If audio-only, deduct credits and record usage
      if (isAudioOnly) {
        const creditsPerMinute = 1;
        const creditsUsed = Math.max(1, Math.ceil(actualDurationMinutes * creditsPerMinute));
        
        // Deduct credits
        const deductResult = userPlanDb.deductCredits(
          user.id,
          creditsUsed,
          `Audio generation: ${actualDurationMinutes.toFixed(2)} minutes`
        );
        
        if (!deductResult.success) {
          return res.status(402).json({ 
            error: "Failed to deduct credits", 
            message: deductResult.message 
          });
        }
        
        // Record audio generation
        audioDb.recordGeneration(
          user.id,
          actualDurationMinutes,
          creditsUsed,
          payload.text?.substring(0, 500) || null, // Store first 500 chars of narration
          payload.voice || null,
          payload.language || null
        );
        
        console.log(`[TTS API] Deducted ${creditsUsed} credits for ${actualDurationMinutes.toFixed(2)} minutes of audio. Remaining credits: ${userPlanDb.getUserCredits(user.id)}`);
      }
      
      // Return base64 audio data with duration and word timestamps for subtitle syncing
      const response = {
        audioData: Buffer.from(result.audioData).toString("base64"),
        mimeType: result.mimeType,
        format: result.format,
        duration: result.duration, // Include actual audio duration
        wordTimestamps: wordTimestamps, // Exact word-level timestamps from audio analysis
      };
      
      // Add credits info if audio-only
      if (isAudioOnly) {
        const creditsPerMinute = 1;
        const creditsUsed = Math.max(1, Math.ceil(actualDurationMinutes * creditsPerMinute));
        response.creditsUsed = creditsUsed;
        response.creditsRemaining = userPlanDb.getUserCredits(user.id);
        response.durationMinutes = actualDurationMinutes;
      }
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/video/assemble", async (req, res, next) => {
    try {
      console.log("[Video Assemble] Received request");
      console.log("[Video Assemble] Request body keys:", Object.keys(req.body || {}));
      console.log("[Video Assemble] Has subtitles:", !!req.body?.subtitles);
      console.log("[Video Assemble] Subtitles count:", req.body?.subtitles?.length || 0);
      
      // Validate request body structure before parsing
      if (!req.body) {
        return res.status(400).json({ error: "Request body is required" });
      }
      
      // Log subtitle data structure for debugging (safely)
      if (req.body.subtitles && Array.isArray(req.body.subtitles)) {
        try {
          const firstSub = req.body.subtitles[0];
          console.log("[Video Assemble] First subtitle entry:", {
            id: firstSub?.id,
            startTime: firstSub?.startTime,
            endTime: firstSub?.endTime,
            textLength: firstSub?.text?.length || 0,
            textPreview: firstSub?.text?.substring(0, 50) || ""
          });
        } catch (logError) {
          console.warn("[Video Assemble] Could not log subtitle entry:", logError);
        }
        // Check for any invalid subtitle entries
        const invalidSubtitles = req.body.subtitles.filter((sub) =>
          !sub || !sub.id || typeof sub.text !== 'string'
        );
        if (invalidSubtitles.length > 0) {
          console.warn(`[Video Assemble] Found ${invalidSubtitles.length} invalid subtitle entries`);
        }
      }
      
      const payload = videoSchema.parse(req.body);
      
      // Decode base64 audio data
      const decodedAudio = {
        ...payload.audio,
        audioData: Buffer.from(payload.audio.audioData, "base64"),
      };
      
      console.log("[Video Assemble] Calling video.assemble with subtitles:", payload.subtitles?.length || 0);
      console.log("[Video Assemble] Target duration:", payload.targetDuration || "not specified");
      const result = await services.video.assemble({
        ...payload,
        audio: decodedAudio,
        subtitles: payload.subtitles,
        subtitleStyle: payload.subtitleStyle,
        targetDuration: payload.targetDuration, // Explicitly pass target duration
      });
      // Read video file and send as base64
      const fs = await import("fs/promises");
      const videoBuffer = await fs.readFile(result.videoPath);
      res.json({
        videoData: videoBuffer.toString("base64"),
        mimeType: result.mimeType,
      });
    } catch (error) {
      console.error("Video assembly error:", error);
      // Pass more detailed error message
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "ValidationError",
          details: error.issues,
        });
      }
      const errorMessage = error.message || "Video assembly failed";
      res.status(500).json({ 
        error: "VideoAssemblyError",
        message: errorMessage 
      });
    }
  });

  // Generate subtitles endpoint
  app.post("/api/subtitles/generate", async (req, res, next) => {
    try {
      const subtitleGenerateSchema = z.object({
        wordTimestamps: z.array(
          z.object({
            word: z.string(),
            startTime: z.number(),
            endTime: z.number(),
          })
        ).min(1),
        audioDuration: z.number().positive(),
        subtitleStyle: z.object({
          color: z.string().optional(),
          fontSize: z.number().optional(),
          fontFamily: z.string().optional(),
          outlineColor: z.string().optional(),
          outlineWidth: z.number().optional(),
        }).optional(),
      });

      const payload = subtitleGenerateSchema.parse(req.body);
      
      console.log("[Subtitle Generate] Generating subtitles from word timestamps");
      console.log(`[Subtitle Generate] Word count: ${payload.wordTimestamps.length}`);
      console.log(`[Subtitle Generate] Audio duration: ${payload.audioDuration}s`);

      const result = await services.video.generateSubtitles({
        wordTimestamps: payload.wordTimestamps,
        audioDuration: payload.audioDuration,
        subtitleStyle: payload.subtitleStyle,
      });

      // Read subtitle file and send as base64
      const fs = await import("fs/promises");
      const subtitleBuffer = await fs.readFile(result.subtitlePath);
      res.json({
        subtitleData: subtitleBuffer.toString("base64"),
        subtitlePath: result.subtitlePath,
      });
    } catch (error) {
      console.error("[Subtitle Generate] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "ValidationError",
          details: error.issues,
        });
      }
      const errorMessage = error.message || "Subtitle generation failed";
      res.status(500).json({
        error: "SubtitleGenerationError",
        message: errorMessage,
      });
    }
  });

  // Burn subtitles into video endpoint
  app.post("/api/subtitles/burn", async (req, res, next) => {
    try {
      const subtitleBurnSchema = z.object({
        videoData: z.string().min(1), // Base64 encoded video
        subtitleData: z.string().min(1), // Base64 encoded subtitle file (ASS)
        subtitleStyle: z.object({
          color: z.string().optional(),
          fontSize: z.number().optional(),
          fontFamily: z.string().optional(),
          outlineColor: z.string().optional(),
          outlineWidth: z.number().optional(),
        }).optional(),
      });

      const payload = subtitleBurnSchema.parse(req.body);
      
      console.log("[Subtitle Burn] Burning subtitles into video");

      // Write video and subtitle files temporarily
      const fs = await import("fs/promises");
      const path = await import("path");
      const tempDir = path.join(__dirname, "../temp/videos");
      await fs.mkdir(tempDir, { recursive: true });

      const timestamp = Date.now();
      const videoPath = path.join(tempDir, `video_${timestamp}.mp4`);
      const subtitlePath = path.join(tempDir, `subtitles_${timestamp}.ass`);

      // Write files
      await fs.writeFile(videoPath, Buffer.from(payload.videoData, "base64"));
      // ASS file bytes are already base64-decoded; write as bytes (UTF-8 text inside)
      await fs.writeFile(subtitlePath, Buffer.from(payload.subtitleData, "base64"));

      // Burn subtitles
      const result = await services.video.burnSubtitles({
        videoPath,
        subtitlePath,
      });

      // Read the result video and send as base64
      const videoBuffer = await fs.readFile(result.videoPath);
      
      // Cleanup temporary files
      await fs.unlink(videoPath).catch(() => {});
      await fs.unlink(subtitlePath).catch(() => {});
      await fs.unlink(result.videoPath).catch(() => {});

      res.json({
        videoData: videoBuffer.toString("base64"),
        mimeType: result.mimeType,
      });
    } catch (error) {
      console.error("[Subtitle Burn] Error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "ValidationError",
          details: error.issues,
        });
      }
      const errorMessage = error.message || "Subtitle burning failed";
      res.status(500).json({
        error: "SubtitleBurningError",
        message: errorMessage,
      });
    }
  });

  // Save thumbnail images endpoint
  app.post("/api/thumbnails/save", async (req, res, next) => {
    try {
      const { type, id, imageData, mimeType } = z.object({
        type: z.enum(["character", "style"]),
        id: z.string().min(1),
        imageData: z.string().min(1),
        mimeType: z.string().optional().default("image/png"),
      }).parse(req.body);

      // Ensure images directory exists
      await fs.mkdir(imagesDir, { recursive: true });

      // Extract base64 data (remove data:image/...;base64, prefix if present)
      const base64Data = imageData.includes(",") 
        ? imageData.split(",")[1] 
        : imageData;
      
      const imageBuffer = Buffer.from(base64Data, "base64");
      
      // Determine file extension from mime type
      const ext = mimeType.includes("png") ? "png" : mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
      const filename = `${type}-${id}.${ext}`;
      const filepath = path.join(imagesDir, filename);
      
      // Save image file
      await fs.writeFile(filepath, imageBuffer);
      
      const imageUrl = `/images/${filename}`;
      console.log(`[Thumbnail Save] Saved ${type} thumbnail: ${filename}`);
      
      res.json({ 
        success: true,
        url: imageUrl,
        filename: filename
      });
    } catch (error) {
      console.error("[Thumbnail Save] Error saving thumbnail:", error);
      res.status(500).json({ 
        error: "Failed to save thumbnail",
        message: error.message 
      });
    }
  });

  // User video library endpoints
  app.post("/api/videos/save", authenticate, async (req, res, next) => {
    try {
      console.log("[Video Save] Received request from user:", req.user.id);
      console.log("[Video Save] Request body keys:", Object.keys(req.body || {}));
      console.log("[Video Save] Title:", req.body?.title);
      console.log("[Video Save] Video data length:", req.body?.videoData?.length || 0);
      
      const { title, videoData, videoMimeType, thumbnailData, durationSeconds, language } = z.object({
        title: z.string().min(1, "Title is required"),
        videoData: z.string().min(1, "Video data is required"),
        videoMimeType: z.string().optional().default("video/mp4"),
        thumbnailData: z.string().optional(),
        durationSeconds: z.number().optional(),
        language: z.string().optional(),
      }).parse(req.body);

      console.log("[Video Save] Parsed data successfully");
      console.log("[Video Save] Video data size:", videoData.length, "characters");
      console.log("[Video Save] Thumbnail data:", thumbnailData ? `${thumbnailData.length} characters` : "none");

      // Convert base64 video data to Buffer
      const videoBuffer = Buffer.from(videoData, "base64");
      console.log("[Video Save] Video buffer size:", videoBuffer.length, "bytes");
      
      const thumbnailBuffer = thumbnailData ? Buffer.from(thumbnailData, "base64") : null;
      if (thumbnailBuffer) {
        console.log("[Video Save] Thumbnail buffer size:", thumbnailBuffer.length, "bytes");
      }

      const videoId = videoDb.save(
        req.user.id,
        title,
        videoBuffer,
        videoMimeType || "video/mp4",
        thumbnailBuffer,
        durationSeconds,
        language
      );

      console.log("[Video Save] Video saved successfully with ID:", videoId);
      res.json({ 
        message: "Video saved successfully", 
        videoId 
      });
    } catch (error) {
      console.error("[Video Save] Error saving video:", error);
      console.error("[Video Save] Error stack:", error.stack);
      next(error);
    }
  });

  app.get("/api/videos", authenticate, (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const videos = videoDb.getUserVideos(req.user.id, limit);
      
      // Convert BLOB data to base64 for JSON response
      const videosWithBase64 = videos.map(video => ({
        id: video.id,
        title: video.title,
        videoMimeType: video.video_mime_type,
        thumbnailData: video.thumbnail_data ? video.thumbnail_data.toString("base64") : null,
        durationSeconds: video.duration_seconds,
        language: video.language,
        createdAt: video.created_at,
      }));

      res.json({ videos: videosWithBase64 });
    } catch (error) {
      console.error("Error fetching user videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/:id", authenticate, (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = videoDb.getVideoById(videoId, req.user.id);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Convert BLOB data to base64 for JSON response
      res.json({
        id: video.id,
        title: video.title,
        videoData: video.video_data.toString("base64"),
        videoMimeType: video.video_mime_type,
        thumbnailData: video.thumbnail_data ? video.thumbnail_data.toString("base64") : null,
        durationSeconds: video.duration_seconds,
        language: video.language,
        createdAt: video.created_at,
      });
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ error: "Failed to fetch video" });
    }
  });

  app.delete("/api/videos/:id", authenticate, (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const result = videoDb.deleteVideo(videoId, req.user.id);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Video not found" });
      }

      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", authenticate, requireAdmin, (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      const users = userDb.findAll(limit, offset);
      
      // Get credits for each user
      const usersWithCredits = users.map(user => {
        const credits = userPlanDb.getUserCredits(user.id);
        return { ...user, credits };
      });
      
      res.json({ users: usersWithCredits });
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id", authenticate, requireAdmin, (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = userDb.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const credits = userPlanDb.getUserCredits(userId);
      const transactions = userPlanDb.getTransactions(userId);
      const videos = videoDb.getUserVideos(userId);
      res.json({ user: { ...user, credits }, transactions, videos });
    } catch (error) {
      console.error("Error fetching admin user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/admin/users/:id/credits", authenticate, requireAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const { amount, description } = z.object({
        amount: z.number().int().positive(),
        description: z.string().optional(),
      }).parse(req.body);

      const user = userDb.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Add credits to user
      userPlanDb.addCredits(userId, amount, description || `Admin credit adjustment: +${amount} tokens`);
      
      // If user doesn't have a plan, assign free plan
      const userPlans = userPlanDb.getUserPlans(userId);
      if (userPlans.length === 0) {
        const freePlan = planDb.findByName("Free");
        if (freePlan) {
          userPlanDb.assignPlan(userId, freePlan.id, freePlan.credits);
        }
      }

      const remainingCredits = userPlanDb.getUserCredits(userId);
      res.json({ message: "Credits added successfully", credits: remainingCredits });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/admin/users/:id/role", authenticate, requireAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = z.object({
        role: z.enum(["user", "admin"]),
      }).parse(req.body);

      const user = userDb.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      userDb.updateRole(userId, role);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/admin/users/:id/status", authenticate, requireAdmin, async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const { is_active } = z.object({
        is_active: z.boolean(),
      }).parse(req.body);

      const user = userDb.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      userDb.updateActiveStatus(userId, is_active);
      res.json({ message: "User status updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/admin/users/:id", authenticate, requireAdmin, (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (userId === req.user.id) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }
      userDb.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Featured videos admin routes
  app.get("/api/admin/featured-videos", authenticate, requireAdmin, (req, res) => {
    try {
      const videos = featuredVideoDb.findAllAdmin(100);
      res.json({ videos });
    } catch (error) {
      console.error("Error fetching admin featured videos:", error);
      res.status(500).json({ error: "Failed to fetch featured videos" });
    }
  });

  // Test route to verify upload endpoint is accessible
  app.get("/api/admin/featured-videos/upload", authenticate, requireAdmin, (req, res) => {
    res.json({ message: "Upload endpoint is accessible. Use POST method to upload videos." });
  });

  // Video upload route - MUST be defined BEFORE the general POST route
  app.post("/api/admin/featured-videos/upload", authenticate, requireAdmin, upload.single("video"), async (req, res, next) => {
    console.log("[Video Upload] Route hit - POST /api/admin/featured-videos/upload");
    console.log("[Video Upload] File:", req.file ? `${req.file.originalname} (${req.file.size} bytes)` : "No file");
    console.log("[Video Upload] Body fields:", { title: req.body?.title, description: req.body?.description, order_index: req.body?.order_index });
    
    try {
      if (!req.file) {
        console.error("[Video Upload] No file in request");
        return res.status(400).json({ error: "No video file provided" });
      }

      // Manual parsing of form fields
      const title = req.body.title?.trim();
      const description = req.body.description?.trim() || null;
      const order_index = req.body.order_index !== undefined ? Number(req.body.order_index) : 0;

      if (!title || title.length === 0) {
        console.error("[Video Upload] Title validation failed");
        // Delete uploaded file if validation fails
        await fs.unlink(req.file.path).catch(console.error);
        return res.status(400).json({ error: "Title is required" });
      }

      const videoUrl = `/uploads/featured-videos/${req.file.filename}`;
      console.log("[Video Upload] Creating video record with URL:", videoUrl);
      const videoId = featuredVideoDb.create(title, videoUrl, null, description, order_index, req.user.id);
      
      console.log("[Video Upload] Video created successfully with ID:", videoId);
      res.json({ 
        message: "Featured video uploaded successfully", 
        videoId,
        video_url: videoUrl
      });
    } catch (error) {
      console.error("[Video Upload] Error uploading featured video:", error);
      console.error("[Video Upload] Error stack:", error.stack);
      // Delete uploaded file on error
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      res.status(500).json({ error: "Failed to upload featured video", message: error.message });
    }
  });

  app.post("/api/admin/featured-videos", authenticate, requireAdmin, async (req, res, next) => {
    try {
      // Manual parsing for flexibility
      const title = req.body.title?.trim();
      const video_url = req.body.video_url?.trim() || null;
      const thumbnail_url = req.body.thumbnail_url?.trim() || null;
      const description = req.body.description?.trim() || null;
      const order_index = req.body.order_index !== undefined ? Number(req.body.order_index) : 0;

      if (!title || title.length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }

      const videoId = featuredVideoDb.create(title, video_url, thumbnail_url, description, order_index, req.user.id);
      res.json({ message: "Featured video created successfully", videoId });
    } catch (error) {
      console.error("Error creating featured video:", error);
      next(error);
    }
  });

  app.put("/api/admin/featured-videos/:id", authenticate, requireAdmin, async (req, res, next) => {
    try {
      const videoId = parseInt(req.params.id);
      
      // Manual parsing
      const title = req.body.title?.trim();
      const video_url = req.body.video_url?.trim() || null;
      const thumbnail_url = req.body.thumbnail_url?.trim() || null;
      const description = req.body.description?.trim() || null;
      const order_index = req.body.order_index !== undefined ? Number(req.body.order_index) : undefined;
      const is_active = req.body.is_active !== undefined ? Boolean(req.body.is_active) : undefined;

      const existing = featuredVideoDb.findById(videoId);
      if (!existing) {
        return res.status(404).json({ error: "Featured video not found" });
      }

      featuredVideoDb.update(
        videoId,
        title ?? existing.title,
        video_url ?? existing.video_url,
        thumbnail_url ?? existing.thumbnail_url,
        description ?? existing.description,
        order_index ?? existing.order_index,
        is_active !== undefined ? is_active : (existing.is_active === 1)
      );
      res.json({ message: "Featured video updated successfully" });
    } catch (error) {
      console.error("Error updating featured video:", error);
      next(error);
    }
  });

  app.delete("/api/admin/featured-videos/:id", authenticate, requireAdmin, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = featuredVideoDb.findById(videoId);
      
      if (video && video.video_url && video.video_url.startsWith("/uploads/")) {
        // Delete the video file
        const videoPath = path.join(__dirname, "..", video.video_url);
        await fs.unlink(videoPath).catch(console.error);
      }
      
      featuredVideoDb.delete(videoId);
      res.json({ message: "Featured video deleted successfully" });
    } catch (error) {
      console.error("Error deleting featured video:", error);
      res.status(500).json({ error: "Failed to delete featured video" });
    }
  });

  // Subscription admin routes
  app.get("/api/admin/subscriptions", authenticate, requireAdmin, (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const offset = parseInt(req.query.offset) || 0;
      const subscriptions = userPlanDb.getAllUserPlans(limit, offset);
      res.json({ subscriptions });
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  app.get("/api/admin/subscriptions/user/:userId", authenticate, requireAdmin, (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const subscriptions = userPlanDb.getUserPlans(userId);
      res.json({ subscriptions });
    } catch (error) {
      console.error("Error fetching user subscriptions:", error);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  app.get("/api/admin/subscriptions/:id", authenticate, requireAdmin, (req, res) => {
    try {
      const subscriptionId = parseInt(req.params.id);
      const subscription = userPlanDb.getPlanById(subscriptionId);
      
      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.json({ subscription });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  app.put("/api/admin/subscriptions/:id/expires", authenticate, requireAdmin, async (req, res, next) => {
    try {
      const subscriptionId = parseInt(req.params.id);
      const { expires_at } = z.object({
        expires_at: z.string(),
      }).parse(req.body);

      userPlanDb.updateExpiration(subscriptionId, expires_at);
      res.json({ message: "Subscription expiration updated successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/subscriptions/:id/renew", authenticate, requireAdmin, async (req, res, next) => {
    try {
      const subscriptionId = parseInt(req.params.id);
      const { months } = z.object({
        months: z.number().int().positive().default(1),
      }).parse(req.body);

      userPlanDb.renewPlan(subscriptionId, months);
      res.json({ message: "Subscription renewed successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(issue => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${path}: ${issue.message}`;
      }).join("; ");
      return res.status(400).json({
        error: "ValidationError",
        message: errorMessages,
        details: error.issues,
      });
    }
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large", message: "Maximum file size is 500MB" });
    }
    if (error.message === "Only video files are allowed") {
      return res.status(400).json({ error: "Invalid file type", message: error.message });
    }
    // Handle "request entity too large" errors
    if (error.type === "entity.too.large" || 
        error.message?.includes("request entity too large") ||
        error.message?.includes("PayloadTooLargeError")) {
      return res.status(413).json({ 
        error: "PayloadTooLarge", 
        message: "Request payload is too large. The video assembly endpoint supports up to 50MB. If you're generating many images, try reducing the number of scenes or image resolution." 
      });
    }
    console.error("Server error:", error);
    res.status(500).json({ error: "InternalServerError", message: error.message });
  });

  return app;
}

export const schemas = {
  storySchema,
  scenesSchema,
  narrationSchema,
};

