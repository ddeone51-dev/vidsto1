/**
 * Script to generate featured images for story categories using Leonardo AI
 * Run with: node scripts/generateCategoryImages.js
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

const categories = [
  { 
    title: "Kids Corner", 
    subtitle: "Magical stories for young minds",
    prompt: "A vibrant, enchanting children's storybook scene with playful cartoon characters, magical forest setting, colorful butterflies, friendly woodland creatures, and a bright sunny sky. Whimsical and joyful, perfect for children's stories. Cartoon illustration style, bright pastel colors, cheerful and innocent atmosphere, family-friendly.",
    filename: "category-kids.jpg"
  },
  { 
    title: "Faith & Bible Stories", 
    subtitle: "Stories of faith, hope, and wisdom",
    prompt: "A serene and inspiring biblical scene with warm golden light, peaceful landscape, and spiritual atmosphere. Realistic style, reverent and uplifting mood, soft lighting.",
    filename: "category-faith.jpg"
  },
  { 
    title: "True Life Stories", 
    subtitle: "Real experiences that inspire",
    prompt: "A realistic, inspiring scene showing people overcoming challenges, moments of triumph, and real-life connections. Photorealistic style, emotional depth, authentic human moments.",
    filename: "category-truelife.jpg"
  },
  { 
    title: "Horror & Mystery", 
    subtitle: "Dark tales and chilling secrets",
    prompt: "A dark, mysterious, and atmospheric horror scene with shadows, fog, and eerie elements. Cinematic style, moody lighting, suspenseful atmosphere, dark and mysterious.",
    filename: "category-horror.jpg"
  },
  { 
    title: "Love & Drama", 
    subtitle: "Emotions, relationships, and life choices",
    prompt: "An emotional, dramatic scene showing human relationships, love, conflict, and deep emotions. Realistic style, cinematic composition, emotional intensity, romantic and dramatic atmosphere.",
    filename: "category-love.jpg"
  },
  { 
    title: "Adventure & Fantasy", 
    subtitle: "Epic journeys beyond imagination",
    prompt: "An epic fantasy adventure scene with heroes, magical creatures, vast landscapes, and epic quests. Fantasy art style, dramatic composition, magical elements, adventurous spirit.",
    filename: "category-adventure.jpg"
  },
  { 
    title: "Motivational & Success Stories", 
    subtitle: "Stories that inspire action and growth",
    prompt: "An empowering and uplifting scene showing a person reaching the top of a mountain, sunrise in the background, symbolizing achievement and success. Realistic style, dramatic lighting, inspiring composition, motivational atmosphere, triumph and victory theme, professional and aspirational.",
    filename: "category-motivational.jpg"
  },
  { 
    title: "African Folktales & Cultural Stories", 
    subtitle: "Wisdom, tradition, and heritage",
    prompt: "A rich, cultural African scene with traditional elements, storytelling, community, and heritage. Realistic style, warm earth tones, cultural authenticity, traditional African setting.",
    filename: "category-african.jpg"
  },
  { 
    title: "Comedy & Funny Stories", 
    subtitle: "Light-hearted stories for laughter",
    prompt: "A fun, humorous, and lighthearted comedic scene with playful characters, funny situations, and cheerful atmosphere. Cartoon style, bright colors, comedic elements, joyful and fun.",
    filename: "category-comedy.jpg"
  },
  { 
    title: "Historical Stories", 
    subtitle: "Stories inspired by real historical events",
    prompt: "A historical scene from the past with period-appropriate settings, costumes, and atmosphere. Realistic style, historical accuracy, dramatic lighting, authentic historical setting.",
    filename: "category-historical.jpg"
  },
  { 
    title: "Sci‑Fi & Future Stories", 
    subtitle: "Technology, AI, and the future of humanity",
    prompt: "A futuristic sci-fi scene with advanced technology, AI, space, and future concepts. Sci-fi art style, high-tech elements, futuristic atmosphere, technological advancement.",
    filename: "category-scifi.jpg"
  },
  { 
    title: "Short Moral Stories", 
    subtitle: "Quick lessons with powerful meaning",
    prompt: "A meaningful, symbolic scene representing life lessons, wisdom, and moral values. Realistic style, symbolic elements, thoughtful composition, inspiring and meaningful atmosphere.",
    filename: "category-moral.jpg"
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

    // Filter to only generate Kids Corner and Motivational & Success Stories
    const categoriesToGenerate = categories.filter(cat => 
      cat.title === "Kids Corner" || cat.title === "Motivational & Success Stories"
    );

    console.log(`Generating ${categoriesToGenerate.length} category images...\n`);

    for (let i = 0; i < categoriesToGenerate.length; i++) {
      const category = categoriesToGenerate[i];
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
      if (i < categoriesToGenerate.length - 1) {
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
















