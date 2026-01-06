import dotenv from "dotenv";
// Load .env file with override to ensure we use the file, not system env vars
dotenv.config({ override: true, path: ".env" });

import { createServer } from "./app.js";
import {
  StoryGenerator,
  SceneBreakdownGenerator,
  NarrationGenerator,
  ImageGenerator,
  LeonardoImageGenerator,
  VertexAIImageGenerator,
  TTSGenerator,
  SpeechToText,
  VideoAssembler,
} from "../src/index.js";

// Check if we should use Vertex AI for Gemini (story/scene generation)
const useVertexAIGemini = process.env.USE_VERTEX_AI_GEMINI === "true" || process.env.USE_VERTEX_AI_GEMINI === "1";

const port = process.env.PORT || 4000;

// Select image provider based on IMAGE_PROVIDER env var
function createImageGenerator() {
  const provider = String(process.env.IMAGE_PROVIDER || "").toLowerCase();
  if (provider === "leonardo") {
    return new LeonardoImageGenerator({});
  }
  if (provider === "vertex" || provider === "vertexai" || provider === "nanobanana") {
    return new VertexAIImageGenerator({});
  }
  return new ImageGenerator({});
}

console.log("[Server] Environment check:");
console.log(`  GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 20) + '... (length: ' + process.env.GOOGLE_API_KEY.length + ')' : 'NOT SET'}`);
console.log(`  GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET (will use vertex-sa.json if available)'}`);
console.log(`  IMAGE_PROVIDER: ${process.env.IMAGE_PROVIDER || 'not set (defaults to Google Imagen)'}`);
console.log(`  LEONARDO_API_KEY: ${process.env.LEONARDO_API_KEY ? 'SET (length: ' + process.env.LEONARDO_API_KEY.length + ')' : 'NOT SET'}`);
console.log(`  GOOGLE_CLOUD_PROJECT_ID: ${process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'NOT SET (will be read from service account JSON)'}`);
console.log(`  GOOGLE_CLOUD_LOCATION: ${process.env.GOOGLE_CLOUD_LOCATION || 'NOT SET (defaults to us-central1)'}`);
console.log(`  USE_VERTEX_AI_GEMINI: ${useVertexAIGemini ? 'true (using Vertex AI for story/scene generation)' : 'false (using Gemini API)'}`);

const generators = {
  story: new StoryGenerator({ useVertexAI: useVertexAIGemini }),
  scenes: new SceneBreakdownGenerator({ useVertexAI: useVertexAIGemini }),
  narration: new NarrationGenerator({}),
  images: createImageGenerator(),
  tts: new TTSGenerator({ provider: "gcp" }), // Uses Google Cloud Text-to-Speech API
  speechToText: new SpeechToText({}), // For word-level timing extraction
  video: new VideoAssembler({ outputDir: "./temp/videos" }),
};

const app = createServer({
  story: {
    generate: (input) => generators.story.generateStory(input),
  },
  scenes: {
    generate: (input) => generators.scenes.generateScenes(input),
  },
  narration: {
    generate: (input) => generators.narration.generateNarration(input),
  },
  images: {
    generate: (input) => generators.images.generateImage(input),
    generateBatch: (input) => generators.images.generateImages(input),
  },
  tts: {
    generate: (input) => generators.tts.generateAudio(input),
    listVoices: (input) => generators.tts.listVoices(input),
  },
  speechToText: {
    transcribe: (input) => generators.speechToText.transcribeWithTimestamps(input),
  },
  video: {
    assemble: (input) => generators.video.assembleVideo(input),
    generateSubtitles: (input) => generators.video.generateSubtitles(input),
    burnSubtitles: (input) => generators.video.burnSubtitles(input),
  },
});

const server = app.listen(port, () => {
  console.log(`Vidisto API listening on http://localhost:${port}`);
  console.log(`\n📡 Payment Callback URL Configuration:`);
  console.log(`   Local: http://localhost:${port}/api/payments/callback`);
  console.log(`   ⚠️  For AzamPay, configure your ngrok URL in the AzamPay dashboard:`);
  console.log(`      https://YOUR-NGROK-URL.ngrok-free.dev/api/payments/callback`);
  console.log(`   To check if callback endpoint is reachable, visit:`);
  console.log(`      http://localhost:${port}/api/payments/callback\n`);
});

// Handle server errors gracefully
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${port} is already in use!`);
    console.error(`   Please stop the process using port ${port} or use a different port.`);
    console.error(`   To find and kill the process: netstat -ano | findstr :${port}`);
    process.exit(1);
  } else {
    throw err;
  }
});

