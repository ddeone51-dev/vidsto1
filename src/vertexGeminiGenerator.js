import { GoogleAuth } from "google-auth-library";

/**
 * Vertex AI Gemini text generation using service account authentication.
 * Uses Vertex AI's Gemini models instead of Gemini API.
 */
export class VertexGeminiGenerator {
  /**
   * @param {{ projectId?: string, location?: string, modelName?: string }} options
   */
  constructor({ 
    projectId,
    location = "us-central1",
    modelName = "gemini-1.5-flash" // Vertex AI Gemini model
  } = {}) {
    this.projectId = projectId ?? process.env.GOOGLE_CLOUD_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
    this.location = location ?? process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
    this.modelName = modelName;
    
    if (!this.projectId) {
      throw new Error("Project ID is required. Set GOOGLE_CLOUD_PROJECT_ID or GOOGLE_CLOUD_PROJECT.");
    }
    
    // Initialize Google Auth with service account
    this.auth = new GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    
    this.modelPath = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelName}`;
    this.apiEndpoint = `${this.location}-aiplatform.googleapis.com`;
    
    console.log(`[Vertex Gemini] ✓ Initialized`);
    console.log(`[Vertex Gemini] ✓ Project: ${this.projectId}, Location: ${this.location}, Model: ${this.modelName}`);
  }

  /**
   * Generate content using Vertex AI Gemini
   * @param {string} prompt - The prompt to generate content from
   * @param {object} options - Generation options
   * @returns {Promise<string>} Generated text
   */
  async generateContent(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxOutputTokens = 8192,
      topP = 0.95,
      topK = 40,
    } = options;

    // Get OAuth access token
    const client = await this.auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken || !accessToken.token) {
      throw new Error("Failed to obtain OAuth access token from service account");
    }

    // Vertex AI REST API endpoint for Gemini
    const url = `https://${this.apiEndpoint}/v1/${this.modelPath}:generateContent`;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens,
        topP,
        topK,
      },
      // Safety settings - Vertex AI allows more control
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
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
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        
        // Handle safety filter errors
        if (errorMsg.includes("PROHIBITED_CONTENT") || errorMsg.includes("safety")) {
          throw new Error(`Content blocked by safety filters: ${errorMsg}. Please try rephrasing your content with more neutral language.`);
        }
        
        throw new Error(`Vertex AI Gemini error (${response.status}): ${errorMsg}`);
      }

      const data = await response.json();
      
      // Extract text from response
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error("Invalid Vertex AI Gemini response format");
      }

      const content = data.candidates[0].content;
      if (!content.parts || !content.parts[0] || !content.parts[0].text) {
        throw new Error("No text content in Vertex AI Gemini response");
      }

      return content.parts[0].text;
    } catch (error) {
      if (error.message.includes("safety") || error.message.includes("PROHIBITED")) {
        throw error; // Re-throw safety errors as-is
      }
      throw new Error(`Failed to generate content with Vertex AI Gemini: ${error.message}`);
    }
  }
}

export default VertexGeminiGenerator;

