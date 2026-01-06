/**
 * Script to generate only the missing character thumbnails
 * Uses Google Imagen API (API key) to avoid Vertex AI rate limits
 * Run with: node scripts/generateMissingThumbnails.js
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

// Only the missing characters
const missingCharacters = [
  { 
    id: "child", 
    label: "Child",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a small-statured person with youthful features, round face, bright eyes, natural lighting, high detail, friendly expression, natural skin texture, school-age appearance, shallow depth of field, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  { 
    id: "baby", 
    label: "Baby",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a very small-statured person with infant-like features, round face, large eyes, natural lighting, high detail, innocent expression, natural skin texture, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  { 
    id: "blackChild", 
    label: "Black Child",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a small-statured black person with youthful features, round face, bright eyes, African features, natural lighting, high detail, friendly expression, natural skin texture, school-age appearance, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  { 
    id: "blackTeen", 
    label: "Black Teenager",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a youthful black person with adolescent features, medium stature, African features, natural lighting, high detail, realistic facial features, natural skin texture, modern style, school-age appearance, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  { 
    id: "student", 
    label: "Student",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a youthful person with student appearance, natural lighting, high detail, curious expression, school uniform or casual clothes, natural skin texture, school-age appearance, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
];

async function generateMissingThumbnails() {
  try {
    // Force use of Google Imagen (API key) instead of Vertex AI
    const generator = new ImageGenerator({});
    const outputDir = join(__dirname, '../web/public/images');
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    console.log('='.repeat(60));
    console.log('Generating Missing Character Thumbnails');
    console.log('='.repeat(60));
    console.log(`Output directory: ${outputDir}`);
    console.log(`Using: Google Imagen (API key)\n`);

    console.log(`\n👤 Generating ${missingCharacters.length} missing character thumbnail images...\n`);
    for (let i = 0; i < missingCharacters.length; i++) {
      const character = missingCharacters[i];
      // Use lowercase for filename consistency
      const filename = `character-${character.id.toLowerCase()}.png`;
      const filePath = join(outputDir, filename);
      
      // Skip if already exists
      if (existsSync(filePath)) {
        console.log(`[${i + 1}/${missingCharacters.length}] ⏭️  Skipping ${character.label} (already exists)`);
        continue;
      }

      console.log(`[${i + 1}/${missingCharacters.length}] 🎭 Generating: ${character.label}`);
      console.log(`   Prompt: ${character.imagePrompt.substring(0, 80)}...`);

      try {
        const result = await generator.generateImage({
          prompt: character.imagePrompt,
          aspectRatio: "1:1", // Square for character portraits
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
        console.log(`   Continuing with next character...\n`);
      }

      // Add delay between requests
      if (i < missingCharacters.length - 1) {
        const delay = 3000; // 3 second delay
        console.log(`   ⏳ Waiting ${delay/1000} seconds before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Missing thumbnail generation complete!');
    console.log(`📁 Images saved to: ${outputDir}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error generating thumbnails:', error);
    process.exit(1);
  }
}

// Run the script
generateMissingThumbnails();

