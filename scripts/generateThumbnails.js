/**
 * Script to generate thumbnail images for image styles and characters
 * Run with: node scripts/generateThumbnails.js
 */

import dotenv from 'dotenv';
dotenv.config({ override: true, path: '.env' });

import { ImageGenerator, LeonardoImageGenerator, VertexAIImageGenerator } from '../src/index.js';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Image styles with prompts (matching App.tsx)
const imageStyles = [
  {
    id: "realistic",
    label: "Realistic",
    imagePrompt: "Photorealistic image, natural lighting, high detail, realistic textures, professional photography style, example image showcasing this art style"
  },
  {
    id: "cartoon",
    label: "Cartoon",
    imagePrompt: "Cartoon illustration style, bold outlines, vibrant colors, flat shading, animated character design, example image showcasing this art style"
  },
  {
    id: "anime",
    label: "Anime",
    imagePrompt: "Anime style illustration, cel-shaded, crisp linework, expressive eyes, Japanese animation style, example image showcasing this art style"
  },
  {
    id: "cinematic",
    label: "Cinematic",
    imagePrompt: "Cinematic still, dramatic lighting, shallow depth of field, film grain, movie poster style, example image showcasing this art style"
  },
  {
    id: "watercolor",
    label: "Watercolor",
    imagePrompt: "Watercolor painting, soft washes, paper texture, flowing colors, artistic brush strokes, example image showcasing this art style"
  },
  {
    id: "pixel",
    label: "Pixel art",
    imagePrompt: "Pixel art style, retro 8-bit graphics, crisp pixels, limited color palette, nostalgic gaming aesthetic, example image showcasing this art style"
  },
  {
    id: "comic",
    label: "Comic",
    imagePrompt: "Comic book style, ink lines, halftone patterns, bold colors, graphic novel illustration, example image showcasing this art style"
  },
  {
    id: "threeD",
    label: "3D render",
    imagePrompt: "3D rendered, clean CGI, soft lighting, smooth surfaces, computer graphics style, example image showcasing this art style"
  },
  {
    id: "oilPainting",
    label: "Oil Painting",
    imagePrompt: "Oil painting style, rich textures, visible brush strokes, classical art technique, museum quality, example image showcasing this art style"
  },
  {
    id: "sketch",
    label: "Sketch",
    imagePrompt: "Pencil sketch style, fine lines, shading, artistic drawing, black and white illustration, example image showcasing this art style"
  },
  {
    id: "pastel",
    label: "Pastel",
    imagePrompt: "Pastel art style, soft colors, gentle tones, dreamy aesthetic, soft focus, example image showcasing this art style"
  },
  {
    id: "neon",
    label: "Neon",
    imagePrompt: "Neon cyberpunk style, glowing neon lights, dark background, vibrant electric colors, futuristic, example image showcasing this art style"
  },
  {
    id: "vintage",
    label: "Vintage",
    imagePrompt: "Vintage style, retro colors, aged look, nostalgic atmosphere, classic photography, example image showcasing this art style"
  },
  {
    id: "minimalist",
    label: "Minimalist",
    imagePrompt: "Minimalist style, simple shapes, clean lines, limited colors, modern design aesthetic, example image showcasing this art style"
  },
  {
    id: "impressionist",
    label: "Impressionist",
    imagePrompt: "Impressionist painting style, visible brush strokes, light and color emphasis, artistic movement, example image showcasing this art style"
  },
  {
    id: "surreal",
    label: "Surreal",
    imagePrompt: "Surreal art style, dreamlike imagery, impossible scenes, artistic fantasy, imaginative, example image showcasing this art style"
  },
  {
    id: "steampunk",
    label: "Steampunk",
    imagePrompt: "Steampunk style, Victorian era, brass and gears, steam technology, retro-futuristic, example image showcasing this art style"
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    imagePrompt: "Cyberpunk style, futuristic cityscape, neon lights, high tech low life, sci-fi noir, example image showcasing this art style"
  },
  {
    id: "abstract",
    label: "Abstract",
    imagePrompt: "Abstract art style, geometric shapes, flowing forms, artistic abstraction, modern art, example image showcasing this art style"
  },
  {
    id: "chalk",
    label: "Chalk",
    imagePrompt: "Chalk drawing style, textured surface, soft colors, artistic street art, hand-drawn aesthetic, example image showcasing this art style"
  },
  {
    id: "ink",
    label: "Ink Wash",
    imagePrompt: "Ink wash painting style, flowing ink, traditional Asian art, monochrome, artistic brushwork, example image showcasing this art style"
  },
  {
    id: "popArt",
    label: "Pop Art",
    imagePrompt: "Pop art style, bold colors, high contrast, comic book aesthetic, Warhol-inspired, example image showcasing this art style"
  },
  {
    id: "gothic",
    label: "Gothic",
    imagePrompt: "Gothic art style, dark atmosphere, dramatic shadows, medieval architecture, mysterious, example image showcasing this art style"
  },
  {
    id: "artDeco",
    label: "Art Deco",
    imagePrompt: "Art Deco style, geometric patterns, elegant lines, 1920s aesthetic, luxury design, example image showcasing this art style"
  },
  {
    id: "vaporwave",
    label: "Vaporwave",
    imagePrompt: "Vaporwave aesthetic, retro colors, synthwave, 80s nostalgia, pink and purple tones, example image showcasing this art style"
  },
  {
    id: "handDrawn",
    label: "Hand Drawn",
    imagePrompt: "Hand-drawn illustration style, sketchy lines, artistic freedom, personal touch, organic feel, example image showcasing this art style"
  },
];

// Character options with hyper-realistic portrait prompts (matching App.tsx)
// Enhanced for professional portrait thumbnails
const characters = [
  { 
    id: "child", 
    label: "Child",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a small-statured person with youthful features, round face, bright eyes, natural lighting, high detail, friendly expression, natural skin texture, school-age appearance, shallow depth of field, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  { 
    id: "teen", 
    label: "Teenager",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a youthful person with adolescent features, medium stature, natural lighting, high detail, realistic facial features, natural skin texture, modern style, school-age appearance, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
  },
  { 
    id: "adult", 
    label: "Adult",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of an adult character, natural lighting, high detail, professional, natural skin texture, studio quality"
  },
  { 
    id: "elder", 
    label: "Elder",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of an elder character, natural lighting, high detail, wise expression, natural skin texture, studio quality"
  },
  { 
    id: "animal", 
    label: "Animal",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional wildlife photography. Close-up portrait of a friendly animal character, natural lighting, high detail, realistic fur or feathers, shallow depth of field, studio quality"
  },
  { 
    id: "fantasy", 
    label: "Fantasy",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional fantasy photography. Close-up portrait of a fantasy creature character, natural lighting, high detail, magical but realistic appearance, cinematic lighting, studio quality"
  },
  { 
    id: "robot", 
    label: "Robot",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional sci-fi photography. Close-up portrait of a humanoid robot character, natural lighting, high detail, realistic metal and mechanical parts, futuristic but realistic, studio quality"
  },
  { 
    id: "warrior", 
    label: "Warrior",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a warrior character, natural lighting, high detail, strong and determined expression, realistic armor or traditional clothing, natural skin texture, studio quality"
  },
  { 
    id: "scientist", 
    label: "Scientist",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a scientist character, natural lighting, high detail, intelligent expression, lab coat, natural skin texture, studio quality"
  },
  { 
    id: "teacher", 
    label: "Teacher",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a teacher character, natural lighting, high detail, warm and friendly expression, professional attire, natural skin texture, studio quality"
  },
  { 
    id: "doctor", 
    label: "Doctor",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a doctor character, natural lighting, high detail, caring expression, medical attire, natural skin texture, studio quality"
  },
  { 
    id: "artist", 
    label: "Artist",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of an artist character, natural lighting, high detail, creative expression, artistic clothing, natural skin texture, studio quality"
  },
  { 
    id: "athlete", 
    label: "Athlete",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of an athlete character, natural lighting, high detail, energetic expression, sports attire, natural skin texture, studio quality"
  },
  { 
    id: "farmer", 
    label: "Farmer",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a farmer character, natural lighting, high detail, hardworking expression, traditional farming attire, natural skin texture, studio quality"
  },
  { 
    id: "chef", 
    label: "Chef",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a chef character, natural lighting, high detail, friendly expression, chef's uniform, natural skin texture, studio quality"
  },
  { 
    id: "musician", 
    label: "Musician",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a musician character, natural lighting, high detail, expressive face, holding instrument, natural skin texture, studio quality"
  },
  { 
    id: "pilot", 
    label: "Pilot",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a pilot character, natural lighting, high detail, confident expression, pilot uniform, natural skin texture, studio quality"
  },
  { 
    id: "detective", 
    label: "Detective",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a detective character, natural lighting, high detail, observant expression, professional attire, natural skin texture, studio quality"
  },
  { 
    id: "princess", 
    label: "Princess",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a princess character, natural lighting, high detail, elegant expression, royal attire, natural skin texture, studio quality"
  },
  { 
    id: "knight", 
    label: "Knight",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a knight character, natural lighting, high detail, noble expression, medieval armor, natural skin texture, studio quality"
  },
  { 
    id: "wizard", 
    label: "Wizard",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a wizard character, natural lighting, high detail, wise expression, mystical robes, natural skin texture, studio quality"
  },
  { 
    id: "explorer", 
    label: "Explorer",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of an explorer character, natural lighting, high detail, adventurous expression, explorer's gear, natural skin texture, studio quality"
  },
  { 
    id: "student", 
    label: "Student",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a youthful person with student appearance, natural lighting, high detail, curious expression, school uniform or casual clothes, natural skin texture, school-age appearance, studio quality, close-up headshot, professional portrait, high resolution, 8k quality"
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
    id: "blackAdult", 
    label: "Black Adult",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a black adult character, natural lighting, high detail, professional, African features, natural skin texture, studio quality"
  },
  { 
    id: "blackElder", 
    label: "Black Elder",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of a black elder character, natural lighting, high detail, wise expression, African features, natural skin texture, studio quality"
  },
  { 
    id: "africanWarrior", 
    label: "African Warrior",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of an African warrior character, natural lighting, high detail, strong and determined expression, traditional African attire or warrior clothing, natural skin texture, studio quality"
  },
  { 
    id: "africanQueen", 
    label: "African Queen",
    imagePrompt: "Photorealistic, DSLR-quality photo, ultra-detailed, cinematic realism, professional portrait photography. Close-up portrait of an African queen character, natural lighting, high detail, regal expression, traditional African royal attire, natural skin texture, studio quality"
  },
];

function createImageGenerator() {
  // Use alternative provider if Vertex AI has rate limits
  const provider = String(process.env.IMAGE_PROVIDER || "").toLowerCase();
  const forceProvider = String(process.env.FORCE_IMAGE_PROVIDER || "").toLowerCase();
  
  // Allow forcing a specific provider via FORCE_IMAGE_PROVIDER env var
  const actualProvider = forceProvider || provider;
  
  if (actualProvider === "vertex" || actualProvider === "vertexai" || actualProvider === "nanobanana") {
    console.log("✅ Using Vertex AI (Imagen 3.0) for hyper-realistic thumbnail generation");
    return new VertexAIImageGenerator({});
  } else if (actualProvider === "leonardo") {
    console.log("✅ Using Leonardo AI for thumbnail generation");
    return new LeonardoImageGenerator({});
  } else {
    console.log("✅ Using Google Imagen (API key) for thumbnail generation");
    console.log("   This uses the Generative AI API with API key authentication");
    return new ImageGenerator({});
  }
}

async function generateThumbnails() {
  try {
    const generator = createImageGenerator();
    const outputDir = join(__dirname, '../web/public/images');
    
    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    console.log('='.repeat(60));
    console.log('Generating Thumbnail Images');
    console.log('='.repeat(60));
    console.log(`Output directory: ${outputDir}`);
    console.log(`Image provider: ${process.env.IMAGE_PROVIDER || 'Google Imagen'}\n`);

    // Generate style images
    console.log(`\n📸 Generating ${imageStyles.length} style thumbnail images...\n`);
    for (let i = 0; i < imageStyles.length; i++) {
      const style = imageStyles[i];
      // Map style IDs to expected filenames (matching App.tsx thumbnail paths)
      const filenameMap = {
        'threeD': 'threed.png',
        'oilPainting': 'oilpainting.png',
        'popArt': 'popart.png',
        'artDeco': 'artdeco.png',
        'handDrawn': 'handdrawn.png',
      };
      const filename = filenameMap[style.id] || `${style.id}.png`;
      const filePath = join(outputDir, filename);
      
      // Skip if already exists
      if (existsSync(filePath)) {
        console.log(`[${i + 1}/${imageStyles.length}] ⏭️  Skipping ${style.label} (already exists)`);
        continue;
      }

      console.log(`[${i + 1}/${imageStyles.length}] 🎨 Generating: ${style.label}`);
      console.log(`   Prompt: ${style.imagePrompt.substring(0, 80)}...`);

      try {
        const result = await generator.generateImage({
          prompt: style.imagePrompt,
          aspectRatio: "16:9",
        });

        // Convert base64 to buffer
        // Handle both data URI format and raw base64
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
        console.log(`   Continuing with next style...\n`);
      }

      // Add delay between requests to avoid rate limiting
      if (i < imageStyles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    // Generate character images
    console.log(`\n👤 Generating ${characters.length} character thumbnail images...\n`);
    for (let i = 0; i < characters.length; i++) {
      const character = characters[i];
      // Map character IDs to expected filenames
      const filenameMap = {
        'blackChild': 'character-blackchild.png',
        'blackTeen': 'character-blackteen.png',
        'blackAdult': 'character-blackadult.png',
        'blackElder': 'character-blackelder.png',
        'africanWarrior': 'character-africanwarrior.png',
        'africanQueen': 'character-africanqueen.png',
      };
      const filename = filenameMap[character.id] || `character-${character.id}.png`;
      const filePath = join(outputDir, filename);
      
      // Skip if already exists
      if (existsSync(filePath)) {
        console.log(`[${i + 1}/${characters.length}] ⏭️  Skipping ${character.label} (already exists)`);
        continue;
      }

      console.log(`[${i + 1}/${characters.length}] 🎭 Generating: ${character.label}`);
      console.log(`   Prompt: ${character.imagePrompt.substring(0, 80)}...`);

      try {
        // Use the prompt as-is (already enhanced with quality terms)
        // Only add enhancement if not already present
        let enhancedPrompt = character.imagePrompt;
        if (!enhancedPrompt.includes("close-up headshot") && !enhancedPrompt.includes("8k quality")) {
          enhancedPrompt = `${character.imagePrompt}, close-up headshot, professional portrait, high resolution, 8k quality`;
        }
        
        const result = await generator.generateImage({
          prompt: enhancedPrompt,
          aspectRatio: "1:1", // Square for character portraits
        });

        // Convert base64 to buffer
        // Handle both data URI format and raw base64
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

      // Add delay between requests to avoid rate limiting
      // Vertex AI imagen-3.0-generate has strict rate limits (often 60 requests per minute)
      // Use longer delays to stay within limits
      const delay = process.env.IMAGE_PROVIDER?.toLowerCase().includes('vertex') ? 15000 : 2000; // 15 seconds for Vertex AI
      if (i < characters.length - 1) {
        console.log(`   ⏳ Waiting ${delay/1000} seconds before next request to avoid rate limiting...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Thumbnail generation complete!');
    console.log(`📁 Images saved to: ${outputDir}`);
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error generating thumbnails:', error);
    process.exit(1);
  }
}

// Run the script
generateThumbnails();

