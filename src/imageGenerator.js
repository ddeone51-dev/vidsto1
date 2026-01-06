/**
 * Google Imagen image generation from prompts.
 * Uses the Generative Language API format for Imagen models.
 */
export class ImageGenerator {
  /**
   * @param {{ apiKey?: string, modelName?: string }} options
   */
  constructor({ apiKey, modelName = "models/imagen-4.0-generate-001" } = {}) {
    this.apiKey = apiKey ?? process.env.GOOGLE_API_KEY;
    if (!this.apiKey) {
      throw new Error("Missing Google API key. Set GOOGLE_API_KEY or pass apiKey.");
    }
    this.baseUrl = "https://generativelanguage.googleapis.com/v1beta";
    this.modelName = modelName;
  }

  /**
   * Generate an image from a text prompt.
   * @param {{ prompt: string, aspectRatio?: string, safetyFilterLevel?: string }} params
   * @returns {Promise<{ imageData: string, mimeType: string }>} Base64 image data
   */
  async generateImage({ prompt, aspectRatio = "16:9", safetyFilterLevel = "block_none" }) {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Image prompt is required.");
    }

    // Try generateContent format first (like Gemini models)
    const url = `${this.baseUrl}/${this.modelName}:generateContent?key=${this.apiKey}`;
    
    // Simplified payload for imagen-4.0-generate - only include supported fields
    // imagen-4.0-generate doesn't support safetyFilterLevel or parameters in this format
    const payload = {
      contents: [
        {
          parts: [
            {
              text: prompt.trim(),
            },
          ],
        },
      ],
    };

    try {
      let response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      // Handle 400 errors - might be invalid payload format, try without any extra fields
      if (!response.ok && response.status === 400) {
        const errorText = await response.text().catch(() => "");
        console.warn(`[ImageGenerator] First attempt failed (400), error: ${errorText.substring(0, 200)}`);
        
        // The payload is already minimal, so if it still fails, the model might not be available
        // Continue to error handling below
      }

      // If generateContent doesn't work, try predict format (Vertex AI style)
      if (!response.ok && response.status === 404) {
        const predictUrl = `${this.baseUrl}/${this.modelName}:predict?key=${this.apiKey}`;
        const predictPayload = {
          instances: [
            {
              prompt: prompt.trim(),
            },
          ],
          parameters: {
            aspectRatio,
            safetyFilterLevel,
            personGeneration: "allow_all",
          },
        };

        response = await fetch(predictUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(predictPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || response.statusText;
          
          // Provide helpful message for billing requirement
          if (errorMsg?.includes("billed") || errorMsg?.includes("billing")) {
            throw new Error(
              `Imagen API requires billing to be enabled on your Google Cloud account. Please enable billing at https://console.cloud.google.com/billing and ensure the Imagen API is enabled in your project. Original error: ${errorMsg}`
            );
          }
          
          throw new Error(
            `Imagen API error (${response.status}): ${errorMsg || "Model may not support image generation or requires different authentication"}`
          );
        }

        const data = await response.json();
        
        // Extract image from prediction response
        if (!data.predictions || !data.predictions[0] || !data.predictions[0].bytesBase64Encoded) {
          throw new Error("Invalid Imagen API response format. Check if the model supports image generation.");
        }

        return {
          imageData: data.predictions[0].bytesBase64Encoded,
          mimeType: "image/png",
        };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        
        // Provide helpful message for billing requirement
        if (errorMsg?.includes("billed") || errorMsg?.includes("billing")) {
          throw new Error(
            `Imagen API requires billing to be enabled on your Google Cloud account. Please enable billing at https://console.cloud.google.com/billing and ensure the Imagen API is enabled in your project. Original error: ${errorMsg}`
          );
        }
        
        throw new Error(
          `Imagen API error (${response.status}): ${errorMsg}`
        );
      }

      const data = await response.json();
      
      // Try to extract image from generateContent response
      if (data.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        return {
          imageData: data.candidates[0].content.parts[0].inlineData.data,
          mimeType: data.candidates[0].content.parts[0].inlineData.mimeType || "image/png",
        };
      }
      
      // Try predictions format
      if (data.predictions?.[0]?.bytesBase64Encoded) {
        return {
          imageData: data.predictions[0].bytesBase64Encoded,
          mimeType: "image/png",
        };
      }

      throw new Error("Invalid Imagen API response format. The model may not support image generation through this API key.");
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to generate image: ${error.message || String(error)}`);
    }
  }

  /**
   * Generate multiple images from an array of prompts.
   * @param {{ prompts: string[], aspectRatio?: string }} params
   * @returns {Promise<Array<{ imageData: string, mimeType: string }>>}
   */
  async generateImages({ prompts, aspectRatio = "16:9", safetyFilterLevel = "block_none" }) {
    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error("Prompts array is required and must not be empty.");
    }

    const results = await Promise.all(
      prompts.map((prompt) =>
        this.generateImage({ prompt, aspectRatio, safetyFilterLevel }).catch((error) => {
          console.error(`Failed to generate image for prompt "${prompt}":`, error);
          return null;
        })
      )
    );

    return results.filter((result) => result !== null);
  }
}

export default ImageGenerator;

