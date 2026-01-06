import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Structured scene breakdown generator.
 */
export class SceneBreakdownGenerator {
  /**
   * @param {{ apiKey?: string, modelName?: string, model?: { generateContent(input: any): Promise<any> } }} options
   */
  constructor({ apiKey, modelName = DEFAULT_MODEL, model } = {}) {
    if (!model) {
      const resolvedKey = apiKey ?? process.env.GOOGLE_API_KEY;
      if (!resolvedKey) {
        throw new Error("Missing Google API key. Set GOOGLE_API_KEY or pass apiKey.");
      }
      const client = new GoogleGenerativeAI(resolvedKey);
      this.model = client.getGenerativeModel({ 
        model: modelName,
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE", // Allow all content
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_CIVIC_INTEGRITY",
            threshold: "BLOCK_NONE",
          },
        ],
      });
    } else {
      this.model = model;
    }
  }

  /**
   * Generate character profiles from story.
   * @param {{ story: string, imageStyle?: string }} params
   * @returns {Promise<Array<{name: string, age: string, gender: string, skinTone: string, faceShape: string, hairStyle: string, hairColor: string, eyeColor: string, bodyType: string, distinctiveFeatures: string, clothingStyle: string}>>}
   */
  async generateCharacterProfiles({ story, imageStyle = "realistic" }) {
    const MAX_STORY_LENGTH = 4000; // Shorter for character extraction
    const truncatedStory = story.length > MAX_STORY_LENGTH 
      ? story.slice(0, MAX_STORY_LENGTH) + "..."
      : story;
    
    const prompt = buildCharacterProfilePrompt({ story: truncatedStory, imageStyle });
    
    console.log(`[Character Profiles] Extracting character profiles from story...`);
    
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const generationConfig = {
          maxOutputTokens: 2048,
          temperature: 0.3,
          topP: 0.9,
        };

        const response = await this.model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig,
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
          ],
        });

        const text = extractResponseText(response);
        if (!text || text.trim().length === 0) {
          throw new Error("Unable to generate character profiles. Please try again.");
        }

        const profiles = parseCharacterProfilesJson(text);
        console.log(`[Character Profiles] Successfully extracted ${profiles.length} character profile(s)`);
        return profiles;
      } catch (err) {
        lastError = err;
        console.warn(`[Character Profiles] Attempt ${attempt} failed: ${err?.message || err}`);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    throw lastError || new Error("Failed to generate character profiles");
  }

  /**
   * Generate 5-10 scenes with Imagen-optimized prompts.
   * @param {{ story: string, minScenes?: number, maxScenes?: number, imageStyle?: string, characterProfiles?: Array }} params
   * @returns {Promise<Array<{title: string, description: string, imagePrompt: string}>>}
   */
  async generateScenes({ story, minScenes = 5, maxScenes = 10, imageStyle = "realistic", characterProfiles = null }) {
    this.#validateInputs({ story, minScenes, maxScenes });
    
    // Step 1: Generate character profiles if not provided
    let profiles = characterProfiles;
    if (!profiles || profiles.length === 0) {
      try {
        console.log(`[Scene Generation] Step 1: Generating character profiles...`);
        profiles = await this.generateCharacterProfiles({ story, imageStyle });
        if (profiles && profiles.length > 0) {
          console.log(`[Scene Generation] ✓ Character profiles locked:`, profiles.map(p => p.name || 'Unnamed').join(', '));
          profiles.forEach((profile, i) => {
            console.log(`[Scene Generation]   Profile ${i + 1}: ${profile.name || 'Character'} - ${profile.age} ${profile.gender}, ${profile.skinTone} skin, ${profile.hairColor} ${profile.hairStyle}`);
          });
        } else {
          console.warn(`[Scene Generation] No character profiles generated. Continuing without locked profiles.`);
        }
      } catch (error) {
        console.warn(`[Scene Generation] Failed to generate character profiles: ${error.message}. Continuing without locked profiles.`);
        profiles = [];
      }
    } else {
      console.log(`[Scene Generation] Using provided character profiles:`, profiles.map(p => p.name || 'Unnamed').join(', '));
    }
    
    // Limit story length to prevent API timeouts (use first 8000 chars which should be enough for 5-8 scenes)
    const MAX_STORY_LENGTH = 8000;
    const truncatedStory = story.length > MAX_STORY_LENGTH 
      ? story.slice(0, MAX_STORY_LENGTH) + "... [truncated for scene generation]"
      : story;
    
    if (story.length > MAX_STORY_LENGTH) {
      console.warn(`Story truncated from ${story.length} to ${MAX_STORY_LENGTH} chars for scene generation`);
    }
    
    const prompt = buildScenePrompt({ story: truncatedStory, minScenes, maxScenes, imageStyle, characterProfiles: profiles });
    
    console.log(`Generating ${minScenes}-${maxScenes} scenes from story (${truncatedStory.length} chars) with ${profiles.length} locked character profile(s)...`);
    
    // Add timeout wrapper for API call (increased to 120 seconds for longer stories)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Scene generation timed out after 120 seconds")), 120000);
    });
    
    // We retry because Gemini sometimes truncates output (partial JSON) which parses as 1 scene.
    // The user's case: required exactly 3 scenes but response was cut off mid-scene.
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Higher output token budget to avoid truncation; lower temperature for strict JSON.
        // Increase tokens more aggressively for longer scene counts
        const baseTokens = minScenes <= 3 ? 3072 : minScenes <= 6 ? 4096 : 6144;
        const generationConfig = {
          maxOutputTokens: attempt === 1 ? baseTokens : attempt === 2 ? Math.min(baseTokens * 1.5, 8192) : Math.min(baseTokens * 2, 8192),
          temperature: attempt === 1 ? 0.3 : 0.2,
          topP: 0.9,
        };

        // On retry, add an extra constraint to keep responses short and complete.
        const retryPrefix =
          attempt === 1
            ? ""
            : [
                "CRITICAL RETRY INSTRUCTION:",
                `- You previously returned incomplete/truncated JSON. You MUST return a COMPLETE JSON array with exactly ${minScenes === maxScenes ? minScenes : `${minScenes}-${maxScenes}`} scenes.`,
                "- Keep descriptions SHORT (1-2 sentences max) so the JSON fits.",
                "- Keep imagePrompt VERY SHORT: Maximum 120 characters per imagePrompt (this is critical to prevent truncation).",
                "- Be extremely concise in imagePrompt - use only essential visual details, no long descriptions.",
                "- Prioritize: style, character, scene, camera angle. Skip detailed descriptions.",
                "- Do NOT include any extra keys, commentary, or trailing text.",
                "- Output must start with '[' and end with ']'.",
                "- Ensure every string value is properly closed with a quote.",
                "",
              ].join("\n");

        const fullPrompt = `${retryPrefix}${prompt}`;

        let response;
        response = await Promise.race([
          this.model.generateContent({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig,
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
            ],
          }),
          timeoutPromise,
        ]);

        console.log(`Received scene generation response (attempt ${attempt}/${maxAttempts})`);

        // Check for safety filter blocks
        if (response?.response?.promptFeedback?.blockReason) {
          const blockReason = response.response.promptFeedback.blockReason;
          if (blockReason === "PROHIBITED_CONTENT") {
            throw new Error(
              "Content blocked by safety filters: PROHIBITED_CONTENT. Google's Gemini API has a non-configurable PROHIBITED_CONTENT filter. Please try rephrasing your story or using more neutral language."
            );
          }
          throw new Error(`Content blocked by safety filters: ${blockReason}. Please try rephrasing your story.`);
        }

        const candidates = response?.response?.candidates || response?.candidates || [];
        if (candidates.length > 0 && candidates[0].finishReason === "SAFETY") {
          throw new Error("Content blocked by safety filters");
        }

        const text = extractResponseText(response);
        if (!text || text.trim().length === 0) {
          throw new Error("Unable to generate scenes. Please try again.");
        }

        console.log(`Parsing scene JSON (${text.length} chars)...`);
        console.log(`Response preview (first 500 chars): ${text.substring(0, 500)}`);
        const scenes = parseScenesJson(text);
        this.#validateScenesCount(scenes, minScenes, maxScenes);

        // Verify character consistency in generated scenes
        if (profiles && profiles.length > 0) {
          console.log(`[Scene Generation] Verifying character consistency across ${scenes.length} scenes...`);
          scenes.forEach((scene, index) => {
            const hasCharacterRef = profiles.some(profile => 
              scene.imagePrompt.toLowerCase().includes(profile.name?.toLowerCase() || '') ||
              scene.imagePrompt.toLowerCase().includes(profile.skinTone?.toLowerCase() || '') ||
              scene.imagePrompt.toLowerCase().includes(profile.hairColor?.toLowerCase() || '')
            );
            if (!hasCharacterRef && index === 0) {
              console.warn(`[Scene Generation] ⚠️ Scene ${index + 1} may not include character profile details`);
            }
          });
        }

        console.log(`Successfully generated ${scenes.length} scenes`);
        return scenes;
      } catch (err) {
        lastError = err;
        console.warn(`Scene generation attempt ${attempt} failed: ${err?.message || err}`);

        // If it's not a count/parse issue, don't hammer retries.
        const msg = String(err?.message || err);
        const isCountOrJsonIssue =
          msg.includes("Scene response count") ||
          msg.includes("Failed to parse scene JSON") ||
          msg.includes("Scene response is not valid JSON") ||
          msg.includes("Expected ',' or '}'");
        if (!isCountOrJsonIssue) {
          throw err;
        }
      }
    }

    try {
      throw lastError;
    } catch (error) {
      console.error("Scene generation error:", error);
      
      if (error.message && error.message.includes("timeout")) {
        throw new Error("Scene generation took too long. Please try again with a shorter story or fewer minutes.");
      }
      
      throw new Error(error.message || "Unable to generate scenes. Please try again.");
    }
  }

  #validateInputs({ story, minScenes, maxScenes }) {
    if (!story || typeof story !== "string") {
      throw new Error("Story text is required.");
    }
    if (!Number.isInteger(minScenes) || minScenes < 1) {
      throw new Error("minScenes must be a positive integer.");
    }
    if (!Number.isInteger(maxScenes) || maxScenes < minScenes) {
      throw new Error("maxScenes must be an integer >= minScenes.");
    }
  }

  #validateScenesCount(scenes, minScenes, maxScenes) {
    if (!Array.isArray(scenes)) {
      throw new Error("Scene response must be an array.");
    }
    if (scenes.length < minScenes || scenes.length > maxScenes) {
      throw new Error(
        `Scene response count (${scenes.length}) must be between ${minScenes} and ${maxScenes}.`,
      );
    }
    scenes.forEach((scene, index) => {
      if (!scene.title || !scene.description || !scene.imagePrompt) {
        throw new Error(`Scene ${index + 1} is missing required fields.`);
      }
    });
  }
}

/**
 * Build the character profile extraction prompt.
 * @param {{ story: string, imageStyle?: string }} params
 * @returns {string}
 */
export function buildCharacterProfilePrompt({ story, imageStyle = "realistic" }) {
  const styleLower = (imageStyle || "realistic").toLowerCase();
  const isRealistic = styleLower === "realistic" || styleLower === "cinematic";
  
  return [
    "You are Vidisto, an AI character designer extracting character profiles from a story.",
    "Analyze the story and create detailed character profiles for ALL main characters.",
    "",
    "CRITICAL: You MUST respond in English only. All JSON property names and values must be in English.",
    "CRITICAL: Do NOT use Chinese, Japanese, or any other non-English characters ANYWHERE in the JSON output.",
    "",
    "For each main character, extract and create a LOCKED character profile with:",
    "- name: Character's name (or 'Main Character' if unnamed, or descriptive name like 'The Hero', 'The Villain')",
    "- age: Approximate age range (e.g., '20s', '30s', '40s', 'teenager', 'elderly', 'middle-aged')",
    "- gender: Male, Female, or Other",
    "- skinTone: Skin tone description (e.g., 'light', 'medium', 'dark', 'olive', 'tan', 'fair', 'bronze')",
    "- faceShape: Face shape (e.g., 'round', 'oval', 'square', 'heart-shaped', 'angular')",
    "- hairStyle: Hair style description (e.g., 'short curly', 'long straight', 'braided', 'bald', 'shoulder-length wavy', 'buzz cut')",
    "- hairColor: Hair color (e.g., 'black', 'brown', 'blonde', 'red', 'gray', 'white', 'auburn')",
    "- eyeColor: Eye color (e.g., 'brown', 'blue', 'green', 'hazel', 'gray', 'amber')",
    "- bodyType: Body type (e.g., 'slim', 'athletic', 'average', 'stocky', 'tall', 'petite')",
    "- distinctiveFeatures: Any distinctive features (e.g., 'glasses', 'beard', 'mustache', 'scar on cheek', 'tattoo on arm', 'piercing', 'none')",
    "- clothingStyle: Usual clothing style and colors (e.g., 'blue jeans and white t-shirt', 'formal black suit', 'casual dress', 'sports jersey')",
    "",
    "IMPORTANT RULES:",
    "- Extract character details from the story text",
    "- If details are not mentioned, use reasonable defaults based on context and story setting",
    "- Create profiles for ALL main characters who appear in multiple scenes",
    "- Create at least ONE profile even if the story doesn't name characters (use 'Main Character')",
    "- Side characters who appear once can be omitted",
    "- Be specific and detailed - these profiles will be LOCKED and reused in every scene",
    "",
    "Return ONLY valid JSON array in English like:",
    '[{"name":"John","age":"30s","gender":"Male","skinTone":"medium","faceShape":"oval","hairStyle":"short wavy","hairColor":"brown","eyeColor":"brown","bodyType":"athletic","distinctiveFeatures":"none","clothingStyle":"blue jeans and white t-shirt"}]',
    "Do not add commentary before or after the JSON.",
    "",
    "Story source:",
    story.trim(),
  ].join("\n");
}

/**
 * Parse character profiles JSON from response.
 * @param {string} text
 * @returns {Array}
 */
export function parseCharacterProfilesJson(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Empty character profile response.");
  }
  
  const startIndex = trimmed.indexOf("[");
  const endIndex = trimmed.lastIndexOf("]");
  
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Character profile response is not valid JSON. The AI response does not contain a valid JSON array.");
  }
  
  let jsonSlice = trimmed.slice(startIndex, endIndex + 1);
  
  // Clean JSON (reuse similar logic from parseScenesJson)
  jsonSlice = jsonSlice.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  jsonSlice = jsonSlice.trim();
  
  try {
    const parsed = JSON.parse(jsonSlice);
    if (!Array.isArray(parsed)) {
      throw new Error("Character profiles must be an array.");
    }
    
    // Validate that profiles have required fields
    const validated = parsed.map((profile, index) => ({
      name: profile.name || `Character ${index + 1}`,
      age: profile.age || 'adult',
      gender: profile.gender || 'unspecified',
      skinTone: profile.skinTone || profile.skin_tone || 'medium',
      faceShape: profile.faceShape || profile.face_shape || 'oval',
      hairStyle: profile.hairStyle || profile.hair_style || 'hair',
      hairColor: profile.hairColor || profile.hair_color || 'brown',
      eyeColor: profile.eyeColor || profile.eye_color || 'brown',
      bodyType: profile.bodyType || profile.body_type || 'average',
      distinctiveFeatures: profile.distinctiveFeatures || profile.distinctive_features || 'none',
      clothingStyle: profile.clothingStyle || profile.clothing_style || 'casual clothes',
    }));
    
    return validated;
  } catch (error) {
    throw new Error(`Failed to parse character profiles JSON: ${error.message}`);
  }
}

/**
 * Build the structured prompt for Gemini.
 * @param {{ story: string, minScenes: number, maxScenes: number, imageStyle?: string, characterProfiles?: Array }} params
 * @returns {string}
 */
export function buildScenePrompt({ story, minScenes, maxScenes, imageStyle = "realistic", characterProfiles = [] }) {
  // If minScenes equals maxScenes, request exactly that number (more explicit)
  const sceneCountText = minScenes === maxScenes 
    ? `exactly ${minScenes}`
    : `${minScenes}-${maxScenes}`;
  
  // Determine style-specific instructions based on user selection
  let styleInstructions = "";
  let styleExample = "";
  let styleBadExample = "";
  
  const styleLower = (imageStyle || "realistic").toLowerCase();
  
  if (styleLower === "realistic") {
    styleInstructions = [
      "STYLE RULES (MANDATORY for REALISTIC):",
      "- Use ONLY photorealistic terms: photorealistic, real-world lighting, cinematic lighting, natural skin texture, DSLR-quality photo, shallow depth of field, high dynamic range, ultra-detailed",
      "- NEVER use illustration, storybook, cartoon, animated, anime, or drawing terms",
      "- Camera terminology is ALLOWED: wide shot, medium shot, close-up, eye-level angle",
      "- Technical photography terms are ALLOWED: depth of field, bokeh, natural lighting, cinematic lighting",
      "- Focus on realistic textures, natural lighting, and photographic quality",
    ].join("\n");
    styleExample = '"Photorealistic, DSLR-quality. 30s Black man, short hair, brown jacket, jeans, walks on dusty road. Wide shot. Natural light. Hopeful mood."';
    styleBadExample = '"A colorful storybook illustration of a character walking. Cartoon style, soft lighting..."';
  } else if (styleLower === "cartoon") {
    styleInstructions = [
      "STYLE RULES (MANDATORY for CARTOON):",
      "- Use cartoon style, stylized characters, smooth outlines, vibrant colors, animated look",
      "- NO photorealistic or realistic terms",
      "- Camera terminology is ALLOWED but keep it simple",
      "- Focus on bold shapes, vibrant colors, and animated aesthetic",
    ].join("\n");
    styleExample = '"Cartoon style, vibrant colors. Character walks on colorful path through forest. Wide shot. Soft light. Adventurous."';
    styleBadExample = '"Photorealistic, natural lighting, high detail..."';
  } else if (styleLower === "illustration" || styleLower === "storybook") {
    styleInstructions = [
      "STYLE RULES (MANDATORY for ILLUSTRATION/STORYBOOK):",
      "- Use storybook illustration, hand-painted look, soft lighting, whimsical style",
      "- NO photorealistic or realistic terms",
      "- Camera terminology should be minimal or avoided",
      "- Focus on artistic, hand-painted aesthetic",
    ].join("\n");
    styleExample = '"Storybook illustration, soft lighting. Character walks on sunlit path through forest. Wide shot. Soft light. Adventurous."';
    styleBadExample = '"Photorealistic, natural lighting, high detail..."';
  } else if (styleLower === "robot" || styleLower === "scifi" || styleLower === "cyberpunk") {
    styleInstructions = [
      "STYLE RULES (MANDATORY for ROBOT/SCI-FI):",
      "- Use futuristic, mechanical design, robotic features, cinematic sci-fi lighting, high-tech environment",
      "- Camera terminology is ALLOWED",
      "- Focus on futuristic, high-tech aesthetic",
    ].join("\n");
    styleExample = '"Futuristic, sci-fi lighting. Robot walks through neon-lit cityscape. Wide shot. Dramatic light. Futuristic."';
    styleBadExample = '"Storybook illustration, soft lighting..."';
  } else {
    // Default: realistic
    styleInstructions = [
      "STYLE RULES (MANDATORY for REALISTIC):",
      "- Use ONLY photorealistic terms: photorealistic, real-world lighting, cinematic lighting, natural skin texture, DSLR-quality photo, shallow depth of field, high dynamic range, ultra-detailed",
      "- NEVER use illustration, storybook, cartoon, animated, anime, or drawing terms",
      "- Camera terminology is ALLOWED: wide shot, medium shot, close-up, eye-level angle",
      "- Technical photography terms are ALLOWED: depth of field, bokeh, natural lighting, cinematic lighting",
    ].join("\n");
    styleExample = '"Photorealistic, DSLR-quality. Character walks on road. Wide shot. Natural light. Hopeful."';
    styleBadExample = '"A colorful storybook illustration..."';
  }
  
  // Build character profile section for prompt
  let characterProfileSection = "";
  if (characterProfiles && characterProfiles.length > 0) {
    const profileDescriptions = characterProfiles.map((profile, index) => {
      const desc = [
        `${profile.name || `Character ${index + 1}`}:`,
        `- Age: ${profile.age || 'adult'}`,
        `- Gender: ${profile.gender || 'unspecified'}`,
        `- Skin tone: ${profile.skinTone || 'medium'}`,
        `- Face: ${profile.faceShape || 'oval'} face shape`,
        `- Hair: ${profile.hairColor || 'brown'} ${profile.hairStyle || 'hair'}`,
        `- Eyes: ${profile.eyeColor || 'brown'} eyes`,
        `- Body: ${profile.bodyType || 'average'} build`,
        profile.distinctiveFeatures && profile.distinctiveFeatures !== 'none' ? `- Features: ${profile.distinctiveFeatures}` : '',
        `- Clothing: ${profile.clothingStyle || 'casual clothes'}`,
      ].filter(Boolean).join(', ');
      return desc;
    }).join('\n');
    
    characterProfileSection = [
      "",
      "🔒 LOCKED CHARACTER PROFILES (MUST BE REUSED IN EVERY SCENE):",
      "These character descriptions are LOCKED and MUST appear in EVERY scene imagePrompt:",
      "",
      profileDescriptions,
      "",
      "CRITICAL CHARACTER CONSISTENCY RULES:",
      "- You MUST reuse the EXACT same character descriptions in EVERY scene",
      "- Do NOT change faces, skin tone, hair, eyes, or body type between scenes",
      "- Do NOT introduce new versions of characters unless the story explicitly says so",
      "- Clothing may only change if the story clearly describes a change",
      "- Side characters must also stay consistent once introduced",
      "- In imagePrompt, always include the full character description from the profile above",
      "- Format: Use the character profile details to create a consistent description like:",
      "  'A [age] [gender] with [skinTone] skin, [faceShape] face, [hairColor] [hairStyle] hair, [eyeColor] eyes, [bodyType] build, [distinctiveFeatures], wearing [clothingStyle]'",
      "",
    ].join("\n");
  }
  
  return [
    "You are Vidisto, an AI showrunner creating scene briefs for video content.",
    `Break the provided story into ${sceneCountText} sequential scenes.`,
    "",
    "CRITICAL: You MUST respond in English only. All JSON property names and values must be in English.",
    "CRITICAL: Do NOT use Chinese, Japanese, or any other non-English characters ANYWHERE in the JSON output.",
    "Do NOT add any text, comments, or characters outside of the JSON structure.",
    "Do NOT include non-English characters between JSON elements, after quotes, or before braces.",
    characterProfileSection,
    "Requirements:",
    "- Each scene must include:",
    "  * title (<= 6 words, evocative, English only)",
    "  * description (2-3 vivid sentences, English only)",
    `  * imagePrompt (${styleLower} style, family-friendly, descriptive, English only)`,
    "",
    "CRITICAL imagePrompt rules:",
    styleInstructions,
    "",
    "- Keep prompts VERY SHORT: Maximum 120 characters per imagePrompt (CRITICAL to prevent JSON truncation)",
    "- Be extremely concise: Use only essential visual details, no long descriptions",
    "- Format: Style + Character + Scene + Camera + Lighting + Mood (keep each part brief)",
    "- Family-friendly, fully clothed characters only",
    "- ALL text must be in English - no Chinese, Japanese, or other languages",
    "- CRITICAL: Do NOT use the words 'child', 'children', 'baby', 'babies', or 'young' in imagePrompt",
    "- Use descriptive terms like 'small-statured person with youthful features' or 'youthful person' instead",
    "",
    "PROMPT STRUCTURE (USE THIS EXACT FORMAT - TOTAL MUST BE ≤120 CHARACTERS):",
    "STYLE: [${styleLower} style, 2-3 words max]",
    characterProfiles && characterProfiles.length > 0 
      ? "CHARACTER: [Age gender, skin, hair, eyes, build - 15 words max, same in every scene]"
      : "CHARACTER: [Brief consistent description - 10 words max]",
    "SCENE: [What's happening - 5 words max]",
    "CAMERA: [Wide/medium/close - 1 word]",
    "LIGHTING: [Natural/cinematic - 1 word]",
    "MOOD: [Emotion - 1 word]",
    "",
    "CRITICAL: Combine all parts into ONE sentence ≤120 characters total.",
    "",
    "Example good imagePrompt (with locked character):",
    characterProfiles && characterProfiles.length > 0
      ? `"${styleExample.split('. ')[0]}. A ${characterProfiles[0].age || 'adult'} ${characterProfiles[0].gender?.toLowerCase() || 'person'} with ${characterProfiles[0].skinTone || 'medium'} skin, ${characterProfiles[0].faceShape || 'oval'} face, ${characterProfiles[0].hairColor || 'brown'} ${characterProfiles[0].hairStyle || 'hair'}, ${characterProfiles[0].eyeColor || 'brown'} eyes, ${characterProfiles[0].bodyType || 'average'} build${characterProfiles[0].distinctiveFeatures && characterProfiles[0].distinctiveFeatures !== 'none' ? `, ${characterProfiles[0].distinctiveFeatures}` : ''}, wearing ${characterProfiles[0].clothingStyle || 'casual clothes'}. ${styleExample.split('. ').slice(1).join('. ')}"`
      : styleExample,
    "",
    "Example bad imagePrompt (DO NOT USE):",
    styleBadExample,
    "",
    "Return ONLY valid JSON array in English like:",
    '[{"title":"Scene Title","description":"Scene description in English.","imagePrompt":"Image prompt in English."}]',
    "Do not add commentary before or after the JSON.",
    "Do not use non-English characters in property names or values.",
    "",
    "Story source:",
    story.trim(),
  ].join("\n");
}

/**
 * Extract text from the Gemini response object.
 * @param {any} response
 * @returns {string}
 */
export function extractResponseText(response) {
  if (!response) return "";
  
  // Check for blocked content before trying to extract text
  if (response?.response?.promptFeedback?.blockReason) {
    const blockReason = response.response.promptFeedback.blockReason;
    throw new Error(`Content blocked by safety filters: ${blockReason}`);
  }
  
  try {
    const direct = response?.response?.text?.() ?? response?.text;
    const value = typeof direct === "function" ? direct() : direct;
    return typeof value === "string" ? value.trim() : "";
  } catch (error) {
    // If text() throws an error about blocked content, handle it
    if (error?.message?.includes("blocked") || error?.message?.includes("PROHIBITED_CONTENT")) {
        throw new Error("Content blocked by safety filters: PROHIBITED_CONTENT. Google's Gemini API has a non-configurable PROHIBITED_CONTENT filter. Please try rephrasing your story or using more neutral language.");
    }
    throw error;
  }
}

/**
 * Clean JSON string by fixing common issues.
 * @param {string} json
 * @returns {string}
 */
function cleanJsonString(json) {
  let cleaned = json;
  
  // Fix common quote issues - replace smart quotes with regular quotes FIRST
  cleaned = cleaned.replace(/[""]/g, '"').replace(/['']/g, "'");
  
  // CRITICAL FIX: Remove orphaned fragments that appear after closing quotes
  // The pattern we're seeing: "full of hope."\n  ophe",
  // This is broken JSON where a fragment appears after a complete string
  // These fixes MUST happen early, before the state machine processes the JSON
  
  const beforeFix = cleaned;
  
  // Step 1: Fix newline-separated broken strings (MOST COMMON CASE)
  // Pattern: "text"\n  fragment",
  cleaned = cleaned.replace(/"([^"]+)"\s*\n\s*([a-z]{1,30})",/gi, (match, text, fragment) => {
    console.log(`[JSON Clean] Removing orphaned fragment after newline: "${text}" ... ${fragment}",`);
    return `"${text}",`;
  });
  
  // Step 2: Fix whitespace-separated broken strings
  // Pattern: "text" fragment", or "text"   fragment"
  // Handle both lowercase and capitalized fragments (like "ToAction")
  cleaned = cleaned.replace(/"([^"]+)"\s+([a-zA-Z0-9]{1,30})",/gi, (match, text, fragment) => {
    console.log(`[JSON Clean] Removing orphaned fragment after whitespace: "${text}" ... ${fragment}",`);
    return `"${text}",`;
  });
  
  // Step 2b: Fix fragments that appear after closing quote but before closing brace (no comma)
  // Pattern: "text"   ToAction"  } - handles capitalized fragments like "ToAction"
  // Also handles: "text"   fragment"  } (any alphanumeric fragment)
  cleaned = cleaned.replace(/"([^"]+)"\s+([a-zA-Z0-9]{1,30})"\s*}/g, (match, text, fragment) => {
    console.log(`[JSON Clean] Removing orphaned fragment before closing brace: "${text}" ... ${fragment}" }`);
    return `"${text}"}`;
  });
  
  // Step 2c: Fix fragments that appear after closing quote with spaces but no delimiter
  // Pattern: "text"   ToAction"  (standalone capitalized fragments)
  // This handles cases where fragment appears before a comma or closing brace
  cleaned = cleaned.replace(/"([^"]+)"\s+([A-Z][a-zA-Z0-9]{1,30})"\s*([,}])/g, (match, text, fragment, delimiter) => {
    console.log(`[JSON Clean] Removing capitalized orphaned fragment: "${text}" ... ${fragment}" ${delimiter}`);
    return `"${text}"${delimiter}`;
  });
  
  // Step 2d: Fix fragments that appear after quote with multiple spaces (more aggressive)
  // Pattern: "text"   ToAction"  (handles cases with 2+ spaces)
  cleaned = cleaned.replace(/"([^"]+)"\s{2,}([a-zA-Z0-9]{1,30})"\s*([,}])/g, (match, text, fragment, delimiter) => {
    console.log(`[JSON Clean] Removing orphaned fragment (multiple spaces): "${text}" ... ${fragment}" ${delimiter}`);
    return `"${text}"${delimiter}`;
  });
  
  // Step 2e: Remove commentary/text that appears after closing quotes (like "ToAction: This will provide...")
  // Pattern: "text" ToAction: ... (removes everything from "ToAction:" onwards until } or , or ])
  // This handles cases where AI adds commentary after JSON properties
  cleaned = cleaned.replace(/"([^"]+)"\s+([A-Z][a-zA-Z0-9]{1,30}):\s*[^}]*/g, (match, text, fragment) => {
    console.log(`[JSON Clean] Removing commentary after quote: "${text}" ... ${fragment}:...`);
    return `"${text}"`;
  });
  
  // Step 2f: Remove text that appears after closing quote followed by colon and more text (more aggressive)
  // Pattern: "text" Fragment: ... (catches lowercase fragments too)
  cleaned = cleaned.replace(/"([^"]+)"\s+([A-Za-z0-9]{2,30}):\s*[^}]*/g, (match, text, fragment) => {
    // Only remove if it doesn't look like a valid JSON property name
    const validProps = ['title', 'description', 'imagePrompt', 'desc', 'img', 'name', 'value'];
    if (!validProps.some(prop => fragment.toLowerCase() === prop.toLowerCase())) {
      console.log(`[JSON Clean] Removing commentary fragment: "${text}" ... ${fragment}:...`);
      return `"${text}"`;
    }
    return match; // Keep it if it looks like a valid property name
  });
  
  // Step 3: Remove fragments between properties
  // Pattern: "text",\n  fragment",\n  "nextProp"
  cleaned = cleaned.replace(/",\s*\n\s*([a-z]{1,30})",\s*\n\s*"/gi, '",\n  "');
  
  // Step 4: Remove fragments right after comma
  // Pattern: "text", fragment",
  cleaned = cleaned.replace(/",\s+([a-z]{1,30})",/gi, '",');
  
  if (cleaned !== beforeFix) {
    console.log(`[JSON Clean] Applied orphaned fragment fixes`);
  }
  
  // Fix unescaped newlines in string values (replace with space)
  // This handles cases where the AI inserted newlines inside string values
  cleaned = cleaned.replace(/"([^"]*)\n([^"]*)"/g, '"$1 $2"');
  
  // CRITICAL: Remove non-English characters that appear BETWEEN JSON elements (BEFORE quote processing)
  // Pattern: "text" [non-English chars] } or "text" [non-English chars] ,
  // Example: "family-friendly." 羡慕},
  // This MUST happen before the state machine processes quotes
  // Use more aggressive pattern: match any non-ASCII between quote and delimiter
  cleaned = cleaned.replace(/"([^"]*)"\s*([^\x00-\x7F]+)\s*([,}\]])/g, (match, text, nonAscii, delimiter) => {
    console.log(`[JSON Clean] Removing non-English characters between JSON elements: "${text}" [${nonAscii}] ${delimiter}`);
    return `"${text}"${delimiter}`;
  });
  
  // Also handle: "text" [non-English] }, (with comma after brace)
  cleaned = cleaned.replace(/"([^"]*)"\s*([^\x00-\x7F]+)\s*([}],)/g, (match, text, nonAscii, delimiter) => {
    console.log(`[JSON Clean] Removing non-English characters before }, : "${text}" [${nonAscii}] ${delimiter}`);
    return `"${text}"${delimiter}`;
  });
  
  // Also handle non-English characters before opening braces/brackets
  cleaned = cleaned.replace(/([^\x00-\x7F\s,{[]+)\s*([{\[])/g, (match, nonAscii, delimiter) => {
    console.log(`[JSON Clean] Removing non-English characters before opening delimiter: [${nonAscii}] ${delimiter}`);
    return delimiter;
  });
  
  // Remove standalone non-English word fragments between properties
  // Pattern: }, [non-English] { or ", [non-English] "
  cleaned = cleaned.replace(/([}\]"])\s*([^\x00-\x7F\s,{[]+)\s*([{["])/g, (match, before, nonAscii, after) => {
    console.log(`[JSON Clean] Removing standalone non-English fragment: ${before} [${nonAscii}] ${after}`);
    return `${before} ${after}`;
  });
  
  // Fix unescaped quotes in string values
  // Strategy: Use a state machine to properly escape quotes inside string values
  let result = '';
  let inString = false;
  let escapeNext = false;
  let inPropertyName = false;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const lookAhead = cleaned.substring(i + 1, Math.min(i + 20, cleaned.length));
    
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      if (!inString) {
        // Starting a new string - check if it's a property name
        if (lookAhead.match(/^\s*:/)) {
          inPropertyName = true;
          inString = true;
          result += char;
        } else {
          // Starting a string value
          inPropertyName = false;
          inString = true;
          result += char;
        }
      } else {
        // Inside a string - check if this closes it
        const afterQuote = cleaned.substring(i + 1).trim();
        if (afterQuote.match(/^[,}\]\s*]/) || afterQuote === '' || afterQuote.startsWith('"')) {
          // This closes the string
          inString = false;
          inPropertyName = false;
          result += char;
        } else {
          // This is likely an unescaped quote inside a string value - escape it
          if (!inPropertyName) {
            result += '\\"';
          } else {
            result += char;
            inString = false;
            inPropertyName = false;
          }
        }
      }
    } else {
      result += char;
    }
  }
  
  cleaned = result;
  
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // CRITICAL: Remove non-English characters that appear BETWEEN JSON elements
  // Pattern: "text" [non-English chars] } or "text" [non-English chars] ,
  // This handles cases like: "family-friendly." 羡慕},
  cleaned = cleaned.replace(/"([^"]*)"\s*([^\x00-\x7F\s,}\]]+)\s*([,}\]])/g, (match, text, nonAscii, delimiter) => {
    console.log(`[JSON Clean] Removing non-English characters between JSON elements: "${text}" [${nonAscii}] ${delimiter}`);
    return `"${text}"${delimiter}`;
  });
  
  // Also handle non-English characters before opening braces/brackets
  cleaned = cleaned.replace(/([^\x00-\x7F\s,{[]+)\s*([{\[])/g, (match, nonAscii, delimiter) => {
    console.log(`[JSON Clean] Removing non-English characters before opening delimiter: [${nonAscii}] ${delimiter}`);
    return delimiter;
  });
  
  // Remove standalone non-English word fragments between properties
  // Pattern: }, [non-English] { or ", [non-English] "
  cleaned = cleaned.replace(/([}\]"])\s*([^\x00-\x7F\s,{[]+)\s*([{["])/g, (match, before, nonAscii, after) => {
    console.log(`[JSON Clean] Removing standalone non-English fragment: ${before} [${nonAscii}] ${after}`);
    return `${before} ${after}`;
  });
  
  // Remove non-ASCII characters from JSON property names (but keep them in string values)
  cleaned = cleaned.replace(/"([^"]*[^\x00-\x7F]+[^"]*)":/g, (match, propName) => {
    const asciiPropName = propName.replace(/[^\x00-\x7F]/g, '');
    console.log(`[JSON Clean] Removing non-ASCII from property name: "${propName}" -> "${asciiPropName}"`);
    return `"${asciiPropName}":`;
  });
  
  // Final pass: Remove any remaining non-English characters outside of string values
  // This is a more aggressive cleanup for any remaining issues
  let finalResult = '';
  let inStringFinal = false;
  let escapeNextFinal = false;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNextFinal) {
      finalResult += char;
      escapeNextFinal = false;
      continue;
    }
    
    if (char === '\\') {
      finalResult += char;
      escapeNextFinal = true;
      continue;
    }
    
    if (char === '"') {
      inStringFinal = !inStringFinal;
      finalResult += char;
    } else if (inStringFinal) {
      // Inside string - keep all characters
      finalResult += char;
    } else {
      // Outside string - remove non-English characters
      if (char.match(/[\x00-\x7F]/) || char.match(/[\s,{}\[\]:]/)) {
        finalResult += char;
      } else {
        // Skip non-English character outside of strings
        console.log(`[JSON Clean] Removing non-English character outside string: ${char} (code: ${char.charCodeAt(0)})`);
      }
    }
  }
  
  return finalResult;
}

/**
 * Parse JSON scenes safely with better error handling.
 * @param {string} text
 */
export function parseScenesJson(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Gemini returned an empty scene response.");
  }
  
  // Find JSON array boundaries
  const startIndex = trimmed.indexOf("[");
  const endIndex = trimmed.lastIndexOf("]");
  
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    // Log the actual response for debugging
    console.error("Failed to find JSON array boundaries. Response preview:", trimmed.substring(0, 500));
    throw new Error("Scene response is not valid JSON. The AI response does not contain a valid JSON array.");
  }
  
  let jsonSlice = trimmed.slice(startIndex, endIndex + 1);
  
  // Check for truncated strings (common issue when JSON is cut off mid-string)
  // Count opening and closing quotes to detect unclosed strings
  const quoteMatches = jsonSlice.match(/"/g);
  const quoteCount = quoteMatches ? quoteMatches.length : 0;
  const isEvenQuotes = quoteCount % 2 === 0;
  
  // If odd number of quotes, we likely have an unclosed string
  if (!isEvenQuotes) {
    console.warn("Detected unclosed string (odd quote count), attempting to fix truncation...");
    const lastQuoteIndex = jsonSlice.lastIndexOf('"');
    const lastBraceIndex = jsonSlice.lastIndexOf('}');
    const lastBracketIndex = jsonSlice.lastIndexOf(']');
    
    // Find where the string likely starts (the opening quote before the last quote)
    let stringStartIndex = -1;
    for (let i = lastQuoteIndex - 1; i >= 0; i--) {
      if (jsonSlice[i] === '"' && (i === 0 || jsonSlice[i - 1] !== '\\')) {
        // Check if this is an opening quote (followed by a colon or comma)
        const afterQuote = jsonSlice.substring(i + 1, lastQuoteIndex);
        if (afterQuote.includes(':') || jsonSlice.substring(Math.max(0, i - 20), i).includes(':')) {
          stringStartIndex = i;
          break;
        }
      }
    }
    
    if (stringStartIndex >= 0) {
      // Extract the truncated string content
      const truncatedContent = jsonSlice.substring(stringStartIndex + 1, lastQuoteIndex + 1);
      console.warn(`Truncated string content (${truncatedContent.length} chars): "${truncatedContent.substring(0, 100)}..."`);
      
      // Close the string, object, and array properly
      jsonSlice = jsonSlice.substring(0, lastQuoteIndex + 1) + '"';
      
      // Count braces to see if we need to close objects
      const openBraces = (jsonSlice.match(/{/g) || []).length;
      const closeBraces = (jsonSlice.match(/}/g) || []).length;
      const missingBraces = openBraces - closeBraces;
      
      // Count brackets to see if we need to close array
      const openBrackets = (jsonSlice.match(/\[/g) || []).length;
      const closeBrackets = (jsonSlice.match(/\]/g) || []).length;
      const missingBrackets = openBrackets - closeBrackets;
      
      // Close missing braces and brackets
      for (let i = 0; i < missingBraces; i++) {
        jsonSlice += '}';
      }
      for (let i = 0; i < missingBrackets; i++) {
        jsonSlice += ']';
      }
      
      console.warn(`Fixed truncation: closed string and added ${missingBraces} braces, ${missingBrackets} brackets`);
    }
  }
  
  // Try parsing the raw JSON first
  try {
    const parsed = JSON.parse(jsonSlice);
    return parsed;
  } catch (firstError) {
    console.warn("Initial JSON parse failed, attempting to clean JSON:", firstError.message);
    console.warn("JSON preview (first 1000 chars):", jsonSlice.substring(0, 1000));
    
    // Try cleaning the JSON
    try {
      const cleaned = cleanJsonString(jsonSlice);
      const parsed = JSON.parse(cleaned);
      console.log("Successfully parsed JSON after cleaning");
      return parsed;
    } catch (cleanError) {
      // If cleaning didn't work, try to extract and fix the problematic section
      console.error("JSON parse error details:", {
        originalError: firstError.message,
        cleanedError: cleanError.message,
        position: cleanError.message?.match(/position (\d+)/)?.[1],
        jsonLength: jsonSlice.length,
        jsonPreview: jsonSlice.substring(0, 1000),
        errorLocation: cleanError.message?.match(/position (\d+)/)?.[1] 
          ? jsonSlice.substring(Math.max(0, parseInt(cleanError.message.match(/position (\d+)/)?.[1] || "0") - 50), parseInt(cleanError.message.match(/position (\d+)/)?.[1] || "0") + 50)
          : "unknown"
      });
      
      // Try to extract just the array content and reconstruct
      try {
        // Remove markdown code blocks if present
        jsonSlice = jsonSlice.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        jsonSlice = jsonSlice.trim();
        
        // CRITICAL FIX: Remove orphaned fragments - apply fixes in order
        
        // Step 1: Fix newline-separated broken strings FIRST (most common case)
        // Pattern: "text."\n  fragment",
        jsonSlice = jsonSlice.replace(/"([^"]+)"\s*\n\s*([a-z]{1,30})",/gi, '"$1",');
        
        // Step 2: Fix whitespace-separated broken strings
        // Pattern: "text." fragment",
        jsonSlice = jsonSlice.replace(/"([^"]+)"\s+([a-z]{1,30})",/gi, '"$1",');
        
        // Step 2b: Remove commentary/text that appears after closing quotes (like "ToAction: This will provide...")
        // Pattern: "text" ToAction: ... (removes everything from "ToAction:" onwards until } or ,)
        jsonSlice = jsonSlice.replace(/"([^"]+)"\s+([A-Z][a-zA-Z0-9]{1,30}):\s*[^}]*/g, '"$1"');
        
        // Step 2c: More aggressive - remove any text after closing quote that contains a colon (commentary)
        const validProps = ['title', 'description', 'imagePrompt', 'desc', 'img', 'name', 'value'];
        jsonSlice = jsonSlice.replace(/"([^"]+)"\s+([A-Za-z0-9]{2,30}):\s*[^}]*/g, (match, text, fragment) => {
          // Only remove if it doesn't look like a valid JSON property name
          if (!validProps.some(prop => fragment.toLowerCase() === prop.toLowerCase())) {
            return `"${text}"`;
          }
          return match;
        });
        
        // Fix broken strings with newlines inside - pattern: "text\nfragment"
        jsonSlice = jsonSlice.replace(/"([^"]*)\n([^"]*)"/g, '"$1 $2"');
        
        // Additional fix: Remove any standalone word fragments followed by ",
        // that appear after a closing quote and before the next property
        // Pattern: "text",\n  fragment",\n  "nextProp"
        jsonSlice = jsonSlice.replace(/",\s*\n\s*([a-z]{1,20})",\s*\n\s*"/gi, '",\n  "');
        
        // Remove any non-ASCII characters from JSON structure (property names)
        jsonSlice = jsonSlice.replace(/"([^"]*[^\x00-\x7F]+[^"]*)":/g, (match, propName) => {
          // Try common property name mappings
          const propMap = {
            '辦法': 'method',
            '標題': 'title',
            '描述': 'description',
            '圖片提示': 'imagePrompt',
            '圖片': 'image',
            '提示': 'prompt',
          };
          for (const [chinese, english] of Object.entries(propMap)) {
            if (propName.includes(chinese)) {
              return `"${english}":`;
            }
          }
          // If no mapping found, remove non-ASCII characters
          const asciiPropName = propName.replace(/[^\x00-\x7F]/g, '').trim();
          return asciiPropName ? `"${asciiPropName}":` : '';
        });
        
        // Try parsing again after cleaning
        const parsed = JSON.parse(jsonSlice);
        return parsed;
      } catch (finalError) {
        // Last resort: provide detailed error message
        const errorPosition = finalError.message?.match(/position (\d+)/)?.[1];
        const contextStart = errorPosition ? Math.max(0, parseInt(errorPosition) - 100) : 0;
        const contextEnd = errorPosition ? Math.min(jsonSlice.length, parseInt(errorPosition) + 100) : 200;
        const errorContext = jsonSlice.substring(contextStart, contextEnd);
        
        throw new Error(
          `Failed to parse scene JSON: ${finalError.message}. ` +
          `Error at position ${errorPosition || 'unknown'}. ` +
          `Context: ${errorContext}... ` +
          `This usually means the AI returned malformed JSON. Please try generating scenes again.`
        );
      }
    }
  }
}

export default SceneBreakdownGenerator;

