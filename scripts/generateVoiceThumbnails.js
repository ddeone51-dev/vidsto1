/**
 * Script to generate voice narrator thumbnails
 * Run with: node scripts/generateVoiceThumbnails.js
 */

import dotenv from 'dotenv';
dotenv.config({ override: true, path: '.env' });

import { ImageGenerator } from '../src/index.js';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Voice types with prompts for generating representative portraits
// Note: Alex is typically a male name, Sarah is female, Marcus is male, Emma is female, David is male, Olivia is female
const voices = [
  {
    id: "voice1",
    name: "Alex",
    description: "Warm and friendly",
    gender: "male",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a warm and friendly man, approachable expression, gentle smile, natural lighting, high detail, friendly demeanor, natural skin texture, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  {
    id: "voice2",
    name: "Sarah",
    description: "Clear and professional",
    gender: "female",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a professional woman, confident expression, clear and articulate appearance, business attire, natural lighting, high detail, professional demeanor, natural skin texture, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  {
    id: "voice3",
    name: "Marcus",
    description: "Deep and authoritative",
    gender: "male",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of an authoritative man, strong presence, deep and commanding expression, confident posture, natural lighting, high detail, authoritative demeanor, natural skin texture, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  {
    id: "voice4",
    name: "Emma",
    description: "Energetic and vibrant",
    gender: "female",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of an energetic and vibrant woman, enthusiastic expression, bright smile, dynamic presence, natural lighting, high detail, energetic demeanor, natural skin texture, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  {
    id: "voice5",
    name: "David",
    description: "Calm and soothing",
    gender: "male",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a calm and soothing man, peaceful expression, gentle demeanor, serene presence, natural lighting, high detail, calming demeanor, natural skin texture, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  {
    id: "voice6",
    name: "Olivia",
    description: "Expressive and dynamic",
    gender: "female",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of an expressive and dynamic woman, animated expression, lively presence, engaging demeanor, natural lighting, high detail, expressive features, natural skin texture, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
];

async function generateVoiceThumbnails() {
  try {
    // Use Google Imagen (API key) to avoid Vertex AI rate limits
    const generator = new ImageGenerator({});
    const outputDir = join(__dirname, '../web/public/images');
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    console.log('='.repeat(60));
    console.log('Generating Voice Narrator Thumbnails');
    console.log('='.repeat(60));
    console.log(`Output directory: ${outputDir}`);
    console.log(`Using: Google Imagen (API key)\n`);

    console.log(`\n🎤 Generating ${voices.length} voice narrator thumbnail images...\n`);
    for (let i = 0; i < voices.length; i++) {
      const voice = voices[i];
      const filename = `voice-${voice.id}.png`;
      const filePath = join(outputDir, filename);
      
      // Skip if already exists
      if (existsSync(filePath)) {
        console.log(`[${i + 1}/${voices.length}] ⏭️  Skipping ${voice.name} (already exists)`);
        continue;
      }

      console.log(`[${i + 1}/${voices.length}] 🎭 Generating: ${voice.name} - ${voice.description}`);
      console.log(`   Prompt: ${voice.imagePrompt.substring(0, 80)}...`);

      try {
        const result = await generator.generateImage({
          prompt: voice.imagePrompt,
          aspectRatio: "1:1", // Square for voice portraits
        });

        // Convert base64 to buffer
        let base64Data = result.imageData;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        } else if (base64Data.includes('data:image')) {
          base64Data = base64Data.replace(/^data:image\/\w+;base64,/, '');
        }
        const buffer = Buffer.from(base64Data, 'base64');

        // Save image
        await writeFile(filePath, buffer);
        
        console.log(`   ✅ Saved: ${filename}\n`);
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        console.log(`   Continuing with next voice...\n`);
      }

      // Add delay between requests
      if (i < voices.length - 1) {
        const delay = 3000; // 3 second delay
        console.log(`   ⏳ Waiting ${delay/1000} seconds before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Voice thumbnail generation complete!');
    console.log(`📁 Images saved to: ${outputDir}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error generating voice thumbnails:', error);
    process.exit(1);
  }
}

// Run the script
generateVoiceThumbnails();

