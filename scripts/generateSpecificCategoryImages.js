/**
 * Script to generate specific category images using Leonardo AI
 * Run with: node scripts/generateSpecificCategoryImages.js
 */

import dotenv from 'dotenv';
dotenv.config({ override: true, path: '.env' });

import { LeonardoImageGenerator } from '../src/index.js';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Only generate these specific categories
const categories = [
  { 
    title: "Kids Corner", 
    subtitle: "Magical stories for young minds",
    prompt: "A vibrant, enchanting children's storybook scene with playful cartoon characters, magical forest setting, colorful butterflies, friendly woodland creatures, and a bright sunny sky. Whimsical and joyful, perfect for children's stories. Cartoon illustration style, bright pastel colors, cheerful and innocent atmosphere, family-friendly.",
    filename: "category-kids.jpg"
  },
  { 
    title: "Motivational & Success Stories", 
    subtitle: "Stories that inspire action and growth",
    prompt: "An empowering and uplifting scene showing a person reaching the top of a mountain, sunrise in the background, symbolizing achievement and success. Realistic style, dramatic lighting, inspiring composition, motivational atmosphere, triumph and victory theme, professional and aspirational.",
    filename: "category-motivational.jpg"
  },
];

async function generateCategoryImages() {
  try {
    const generator = new LeonardoImageGenerator();
    const outputDir = join(__dirname, '../web/public/images');
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Generating ${categories.length} category images...\n`);

    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      console.log(`[${i + 1}/${categories.length}] Generating image for: ${category.title}`);
      console.log(`  Prompt: ${category.prompt.substring(0, 80)}...`);

      try {
        // Generate image using Leonardo AI
        const result = await generator.generateImage({
          prompt: category.prompt,
          aspectRatio: "16:9",
          style: "REALISTIC" // Use realistic style for category images
        });

        // Convert base64 to buffer
        const base64Data = result.imageData.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Save image to public/images directory
        const filePath = join(outputDir, category.filename);
        await writeFile(filePath, buffer);
        
        console.log(`  ✓ Saved to: ${category.filename}\n`);
      } catch (error) {
        console.error(`  ✗ Failed to generate image for ${category.title}:`, error.message);
        console.log(`  Continuing with next category...\n`);
      }

      // Add a small delay between requests to avoid rate limiting
      if (i < categories.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    console.log('Category image generation complete!');
    console.log(`Images saved to: ${outputDir}`);
  } catch (error) {
    console.error('Error generating category images:', error);
    process.exit(1);
  }
}

// Run the script
generateCategoryImages();
