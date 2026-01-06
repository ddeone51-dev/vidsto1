/**
 * Script to regenerate specific style thumbnails
 * Run with: node scripts/regenerateStyleThumbnails.js
 */

import dotenv from 'dotenv';
dotenv.config({ override: true, path: '.env' });

import { ImageGenerator } from '../src/index.js';
import { writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Style thumbnails to regenerate
const stylesToRegenerate = [
  {
    id: "realistic",
    label: "Realistic",
    filename: "realistic.png",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, real-world lighting, natural skin texture, shallow depth of field, high dynamic range. Professional portrait photography example showcasing photorealistic style, natural lighting, realistic textures, high detail"
  },
  {
    id: "cartoon",
    label: "Cartoon",
    filename: "cartoon.png",
    imagePrompt: "Cartoon style, stylized characters, smooth outlines, vibrant colors, animated look. Example image showcasing cartoon illustration style, bold outlines, vibrant colors, flat shading, animated character design"
  },
  {
    id: "anime",
    label: "Anime",
    filename: "anime.png",
    imagePrompt: "Anime style, cel-shaded, crisp linework, expressive eyes, Japanese animation style. Example image showcasing anime illustration style, cel-shaded, crisp linework, expressive eyes, Japanese animation aesthetic"
  },
  {
    id: "watercolor",
    label: "Watercolor",
    filename: "watercolor.png",
    imagePrompt: "Watercolor painting, soft washes, paper texture, flowing colors, artistic brush strokes. Example image showcasing watercolor painting style, soft washes, paper texture, flowing colors, artistic brush strokes"
  },
  {
    id: "pixel",
    label: "Pixel art",
    filename: "pixel.png",
    imagePrompt: "Pixel art style, retro 8-bit graphics, crisp pixels, limited color palette, nostalgic gaming aesthetic. Example image showcasing pixel art style, retro 8-bit graphics, crisp pixels, limited color palette, nostalgic gaming aesthetic"
  },
];

async function regenerateStyleThumbnails() {
  try {
    // Use Google Imagen (API key) to avoid Vertex AI rate limits
    const generator = new ImageGenerator({});
    const outputDir = join(__dirname, '../web/public/images');
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    console.log('='.repeat(60));
    console.log('Regenerating Style Thumbnails');
    console.log('='.repeat(60));
    console.log(`Output directory: ${outputDir}`);
    console.log(`Using: Google Imagen (API key)\n`);

    console.log(`\n🎨 Regenerating ${stylesToRegenerate.length} style thumbnail images...\n`);
    for (let i = 0; i < stylesToRegenerate.length; i++) {
      const style = stylesToRegenerate[i];
      const filePath = join(outputDir, style.filename);
      
      // Delete existing file if it exists
      if (existsSync(filePath)) {
        try {
          await unlink(filePath);
          console.log(`[${i + 1}/${stylesToRegenerate.length}] 🗑️  Deleted existing: ${style.filename}`);
        } catch (error) {
          console.warn(`[${i + 1}/${stylesToRegenerate.length}] ⚠️  Could not delete existing file: ${error.message}`);
        }
      }

      console.log(`[${i + 1}/${stylesToRegenerate.length}] 🎨 Generating: ${style.label}`);
      console.log(`   Prompt: ${style.imagePrompt.substring(0, 80)}...`);

      try {
        const result = await generator.generateImage({
          prompt: style.imagePrompt,
          aspectRatio: "16:9", // Standard aspect ratio for style examples
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
        
        console.log(`   ✅ Saved: ${style.filename}\n`);
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
        console.log(`   Continuing with next style...\n`);
      }

      // Add delay between requests
      if (i < stylesToRegenerate.length - 1) {
        const delay = 3000; // 3 second delay
        console.log(`   ⏳ Waiting ${delay/1000} seconds before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Style thumbnail regeneration complete!');
    console.log(`📁 Images saved to: ${outputDir}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error regenerating thumbnails:', error);
    process.exit(1);
  }
}

// Run the script
regenerateStyleThumbnails();



