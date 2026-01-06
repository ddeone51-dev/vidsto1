import { GoogleGenerativeAI } from "@google/generative-ai";
import { VertexGeminiGenerator } from "./vertexGeminiGenerator.js";

const DEFAULT_MODEL = "gemini-2.5-flash";

export class StoryGenerator {
  /**
   * @param {{ apiKey?: string, modelName?: string, model?: { generateContent(input: any): Promise<any> }, useVertexAI?: boolean }} options
   */
  constructor({ apiKey, modelName = DEFAULT_MODEL, model, useVertexAI } = {}) {
    // Check if we should use Vertex AI (via env var or parameter)
    const shouldUseVertexAI = useVertexAI ?? (process.env.USE_VERTEX_AI_GEMINI === "true" || process.env.USE_VERTEX_AI_GEMINI === "1");
    
    if (shouldUseVertexAI) {
      // Use Vertex AI Gemini
      console.log("[StoryGenerator] Using Vertex AI Gemini for story generation");
      this.vertexGemini = new VertexGeminiGenerator({ modelName: modelName === "gemini-2.5-flash" ? "gemini-1.5-flash-001" : modelName });
      this.useVertexAI = true;
      this.model = null; // Not used when using Vertex AI
    } else if (!model) {
      // Use Gemini API (default)
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
      this.useVertexAI = false;
      this.vertexGemini = null;
    } else {
      this.model = model;
      this.useVertexAI = false;
      this.vertexGemini = null;
    }
  }

  /**
   * Generate a long-form story using Gemini.
   * @param {{ title: string, language: string, minutes: number, summary?: string, genre?: string, ageRange?: string, setting?: string, theme?: string, pacing?: string }} params
   * @returns {Promise<string>}
   */
  async generateStory({ title, language, minutes, summary, genre, ageRange, setting, theme, pacing }) {
    this.#validateInputs({ title, language, minutes });
    const prompt = buildStoryPrompt({ title, language, minutes, summary, genre, ageRange, setting, theme, pacing });
    
    console.log(`Generating story: "${title}" (${minutes} minutes, ${language})...`);
    
    // Use Vertex AI if enabled
    if (this.useVertexAI && this.vertexGemini) {
      try {
        const story = await this.vertexGemini.generateContent(prompt, {
          temperature: 0.9,
          maxOutputTokens: 8192,
          topP: 0.95,
          topK: 40,
        });
        console.log(`Story generated successfully (${story.length} characters)`);
        return story;
      } catch (error) {
        const errorMsg = error.message || String(error) || "";
        if (errorMsg.includes("PROHIBITED_CONTENT") || errorMsg.includes("safety")) {
          throw new Error(`Content blocked by safety filters: PROHIBITED_CONTENT. Google's Gemini API has a non-configurable PROHIBITED_CONTENT filter. Please try rephrasing your story or using more neutral language.`);
        }
        throw error;
      }
    }
    
    // Add timeout wrapper for API call (120 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Story generation timed out after 120 seconds")), 120000);
    });
    
    try {
      // Try with explicit safety settings in the request
      // The Google Generative AI SDK supports passing safety settings at generation time
      let response;
      try {
        // First try with structured format including safety settings
        response = await Promise.race([
          this.model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
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
      } catch (formatError) {
        // Check if this is a safety filter error
        if (formatError?.response?.promptFeedback?.blockReason === "PROHIBITED_CONTENT" ||
            formatError.message?.includes("PROHIBITED_CONTENT")) {
          throw formatError; // Re-throw to be handled by outer catch
        }
        
        // If structured format fails for other reasons, fall back to simple string format
        // The model-level safety settings should still apply
        console.log("Structured format failed, trying simple string format:", formatError.message);
        try {
          response = await Promise.race([
            this.model.generateContent(prompt),
            timeoutPromise,
          ]);
        } catch (fallbackError) {
          // Check if fallback also has safety filter error
          if (fallbackError?.response?.promptFeedback?.blockReason === "PROHIBITED_CONTENT" ||
              fallbackError.message?.includes("PROHIBITED_CONTENT")) {
            throw fallbackError;
          }
          throw fallbackError;
        }
      }
      
      console.log("Received story generation response");
      console.log("Response type:", typeof response);
      console.log("Response keys:", response ? Object.keys(response) : "null");
      
      // Check for safety filter blocks in the response
      const promptFeedback = response?.response?.promptFeedback;
      if (promptFeedback?.blockReason) {
        const blockReason = promptFeedback.blockReason;
        console.error("Content blocked by safety filters at prompt level:", blockReason);
        // Log the safety ratings for debugging
        if (promptFeedback.safetyRatings) {
          console.error("Safety ratings:", JSON.stringify(promptFeedback.safetyRatings, null, 2));
        }
        throw new Error(`Content blocked by safety filters: ${blockReason}. The content may have triggered safety filters. Please try a different title or summary.`);
      }
      
      // Check candidates for safety ratings and finish reasons
      const candidates = response?.response?.candidates || response?.candidates || [];
      if (candidates.length > 0) {
        const candidate = candidates[0];
        
        // Check finish reason
        if (candidate.finishReason === "SAFETY") {
          console.error("Content blocked by safety filters - finish reason: SAFETY");
          if (candidate.safetyRatings) {
            console.error("Safety ratings:", JSON.stringify(candidate.safetyRatings, null, 2));
          }
          throw new Error(`Content blocked by safety filters. The generated content was flagged by safety filters. Please try a different title or summary.`);
        }
        
        // Check safety ratings even if finish reason is not SAFETY
        if (candidate.safetyRatings && Array.isArray(candidate.safetyRatings)) {
          const highRiskRatings = candidate.safetyRatings.filter(
            r => r.probability === "HIGH" || r.probability === "MEDIUM"
          );
          if (highRiskRatings.length > 0) {
            console.warn("High/Medium risk safety ratings detected:", JSON.stringify(highRiskRatings, null, 2));
            // Don't throw here - just log, as the content might still be returned
          }
        }
      }
      
      // Handle different response formats from Google Generative AI
      let story = "";
      
      if (response?.response?.text) {
        // Standard format: response.response.text() or response.response.text
        const textMethod = response.response.text;
        story = typeof textMethod === "function" ? textMethod() : textMethod;
      } else if (response?.text) {
        // Direct text property
        story = typeof response.text === "function" ? response.text() : response.text;
      } else if (response?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        // Alternative format with candidates
        story = response.response.candidates[0].content.parts[0].text;
      } else if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        // Direct candidates format
        story = response.candidates[0].content.parts[0].text;
      } else {
        // Log the full response for debugging
        console.error("Unexpected response format:", JSON.stringify(response, null, 2));
        throw new Error("Unexpected response format from story generation API");
      }
      
      const cleaned = (story ?? "").trim();
      
      if (!cleaned) {
        console.error("Generated story is empty");
        throw new Error("Unable to generate story. The API returned an empty response. Please try again.");
      }
      
      console.log(`Story generated successfully (${cleaned.length} characters)`);
      return cleaned;
    } catch (error) {
      console.error("Story generation error:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      // Check for safety filter blocks in the error response
      const promptFeedback = error?.response?.promptFeedback || error?.promptFeedback;
      if (promptFeedback?.blockReason) {
        const blockReason = promptFeedback.blockReason;
        console.error("Content blocked by safety filters:", blockReason);
        if (promptFeedback.safetyRatings) {
          console.error("Safety ratings:", JSON.stringify(promptFeedback.safetyRatings, null, 2));
        }
        
        if (blockReason === "PROHIBITED_CONTENT") {
          throw new Error("The title or content you provided was flagged by content safety filters. PROHIBITED_CONTENT cannot be overridden. Please try a different title or modify your story summary to avoid potentially sensitive topics.");
        }
        
        throw new Error(`Content blocked by safety filters: ${blockReason}. Please try a different title or summary.`);
      }
      
      // Handle specific API errors
      if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("API key")) {
        throw new Error("Invalid Google API key. Please check your GOOGLE_API_KEY environment variable.");
      }
      
      if (error.message?.includes("timeout") || error.name === "TimeoutError") {
        throw new Error("Story generation took too long. Please try again with a shorter duration.");
      }
      
      if (error.message?.includes("QUOTA_EXCEEDED") || error.message?.includes("quota")) {
        throw new Error("API quota exceeded. Please check your Google API usage limits.");
      }
      
      // Handle safety filter errors more specifically
      if (error.message?.includes("PROHIBITED_CONTENT") || 
          error.message?.includes("SAFETY") || 
          error.message?.includes("blocked") ||
          error.message?.includes("safety filter")) {
        console.error("Safety filter error details:", {
          message: error.message,
          name: error.name,
          response: error.response,
        });
        throw new Error("Content blocked by safety filters: PROHIBITED_CONTENT. Google's Gemini API has a non-configurable PROHIBITED_CONTENT filter that cannot be disabled. Please try: 1) Using a different title, 2) Rephrasing your story summary, 3) Avoiding potentially sensitive topics, or 4) Using more neutral language.");
      }
      
      throw new Error(error.message || "Unable to generate story. Please try again.");
    }
  }

  #validateInputs({ title, language, minutes }) {
    if (!title) throw new Error("Title is required.");
    if (!language) throw new Error("Language is required.");
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new Error("Minutes must be a positive number.");
    }
  }
}

/**
 * @param {{ title: string, language: string, minutes: number, summary?: string, genre?: string, ageRange?: string, setting?: string, theme?: string, pacing?: string }} config
 */
export function buildStoryPrompt({ title, language, minutes, summary, genre, ageRange, setting, theme, pacing }) {
  const summaryBlock = summary
    ? `Existing summary or context:\n${summary.trim()}`
    : "Existing summary or context:\nNone provided.";

  const additionalParams = [];
  if (genre) additionalParams.push(`Genre: ${genre}`);
  if (ageRange) additionalParams.push(`Target audience: ${ageRange}`);
  if (setting) additionalParams.push(`Setting: ${setting}`);
  if (theme) additionalParams.push(`Theme: ${theme}`);
  if (pacing) additionalParams.push(`Pacing: ${pacing}`);

  const paramsBlock = additionalParams.length > 0 
    ? additionalParams.join("\n") + "\n"
    : "";

  // Convert minutes to seconds for clarity
  const seconds = Math.round(minutes * 60);
  // Estimate word count: average reading speed is ~150 words per minute = 2.5 words per second
  // For safety, use 2 words per second to ensure it fits within the duration
  // This ensures the story will be approximately the right length when narrated
  const maxWords = Math.floor(seconds * 2);
  const targetWords = Math.floor(seconds * 2.2); // Target slightly higher for better accuracy
  
  return [
    `Generate a ${seconds}-second story about: ${title.trim()}`,
    "",
    `CRITICAL REQUIREMENT: This story MUST be exactly ${seconds} seconds when narrated aloud at normal speaking pace.`,
    `DO NOT generate a longer story. DO NOT generate a 2-minute story and trim it.`,
    `Generate ONLY a ${seconds}-second story from the start.`,
    `TARGET WORD COUNT: ${targetWords} words (aim for this to achieve ${seconds} seconds)`,
    `MAXIMUM WORD COUNT: ${maxWords} words (hard limit - do not exceed)`,
    `CALCULATION: Average speaking rate is 2-2.5 words per second. For ${seconds} seconds, use ${targetWords}-${maxWords} words.`,
    "",
    `Language: ${language.trim()}`,
    paramsBlock,
    summaryBlock,
    "",
    "Story Requirements:",
    `- The story must be EXACTLY ${seconds} seconds when read aloud at normal pace`,
    `- TARGET: ${targetWords} words (ideal length for ${seconds} seconds)`,
    `- MAXIMUM: ${maxWords} words (hard limit - never exceed)`,
    `- Write a complete, self-contained story that fits within ${seconds} seconds`,
    `- Be concise and focused - every word counts`,
    `- Keep continuous prose only; no lists, headings, or scene numbers`,
    `- Maintain vivid imagery and engaging narrative`,
    `- Focus on positive themes suitable for all audiences`,
    `- Respond with ONLY the story text - nothing else`,
    "",
    `VERIFICATION: After writing, count the words. If it exceeds ${maxWords} words, shorten it.`,
    `Remember: Generate a ${seconds}-second story (target ${targetWords} words, max ${maxWords} words), NOT a longer story that will be trimmed.`,
  ].filter(Boolean).join("\n");
}

export default StoryGenerator;

