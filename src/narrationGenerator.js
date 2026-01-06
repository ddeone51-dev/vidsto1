import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.5-flash";

/**
 * Generates TTS-friendly narration scripts derived from full stories.
 */
export class NarrationGenerator {
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
   * Produce a clean narration script from story text.
   * @param {{ story: string, language?: string, tone?: string }} params
   * @returns {Promise<string>}
   */
  async generateNarration({ story, language = "English", tone = "warm" }) {
    this.#validateInputs({ story, language });
    const prompt = buildNarrationPrompt({ story, language, tone });
    
    try {
      // Try with explicit safety settings, fallback to simple format if needed
      let response;
      try {
        response = await this.model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
          ],
        });
      } catch (formatError) {
        console.log("Structured format failed, trying simple string format:", formatError.message);
        response = await this.model.generateContent(prompt);
      }
      
      // Check if response was blocked by safety filters
      if (response?.response?.promptFeedback?.blockReason) {
        const blockReason = response.response.promptFeedback.blockReason;
        throw new Error(`Content was blocked by safety filters (${blockReason}). Please try with a different story.`);
      }
      
      const candidates = response?.response?.candidates || response?.candidates || [];
      if (candidates.length > 0 && candidates[0].finishReason === "SAFETY") {
        throw new Error("Content was blocked by safety filters. Please try with different story content.");
      }
      
      const text = extractNarrationText(response);
      if (!text) {
        throw new Error("Gemini returned an empty narration response.");
      }
      return text;
    } catch (error) {
      // Handle PROHIBITED_CONTENT errors
      if (error.response?.promptFeedback?.blockReason === "PROHIBITED_CONTENT" ||
          error.message?.includes("PROHIBITED_CONTENT") ||
          error.message?.includes("blocked") ||
          error.message?.includes("SAFETY")) {
        throw new Error("Content blocked by safety filters: PROHIBITED_CONTENT. Google's Gemini API has a non-configurable PROHIBITED_CONTENT filter. Please try rephrasing your story content or using more neutral language.");
      }
      throw error;
    }
  }

  #validateInputs({ story, language }) {
    if (!story || typeof story !== "string") {
      throw new Error("Story text is required.");
    }
    if (!language) {
      throw new Error("Language is required.");
    }
  }
}

/**
 * Build the narration polishing prompt.
 * @param {{ story: string, language: string, tone: string }} params
 */
export function buildNarrationPrompt({ story, language, tone }) {
  return [
    "You are Vidisto, an AI voice director adapting stories for narration.",
    `Language: ${language.trim()}`,
    `Tone guidance: ${tone.trim()}`,
    "",
    "Rewrite the story into a narration-ready script with these constraints:",
    "- Flow as natural spoken paragraphs (2-4 sentences each).",
    "- Use simple, clear sentences and conversational cadence.",
    "- No titles, bullet points, scene numbers, or stage directions.",
    "- Keep time references, names, and imagery consistent with the source.",
    "- Output only the narration text with blank lines between paragraphs.",
    "",
    "Story source:",
    story.trim(),
  ].join("\n");
}

/**
 * Extract narration text content from Gemini responses.
 * @param {any} response
 * @returns {string}
 */
export function extractNarrationText(response) {
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
      throw new Error("Content blocked by safety filters: PROHIBITED_CONTENT. Google's Gemini API has a non-configurable PROHIBITED_CONTENT filter. Please try rephrasing your story content or using more neutral language.");
    }
    throw error;
  }
}

export default NarrationGenerator;

