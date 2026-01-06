/**
 * Leonardo AI image generation using Phoenix 1.0 model
 * Documentation: https://docs.leonardo.ai/
 */
export class LeonardoImageGenerator {
  constructor({ apiKey } = {}) {
    this.apiKey = apiKey ?? process.env.LEONARDO_API_KEY;
    if (!this.apiKey) {
      throw new Error("Missing Leonardo API key. Set LEONARDO_API_KEY or pass apiKey.");
    }
    this.baseUrl = "https://cloud.leonardo.ai/api/rest/v1";
    this.modelId = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3"; // Phoenix 1.0
  }

  /**
   * Generate an image from a text prompt
   * @param {{ prompt: string, aspectRatio?: string, style?: string }} params
   * @returns {Promise<{ imageData: string, mimeType: string }>} Base64 image data
   */
  async generateImage({ prompt, aspectRatio = "16:9", style }) {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Image prompt is required.");
    }

    try {
      // Step 1: Create generation
      // Build the prompt with style guidance if needed
      let enhancedPrompt = prompt.trim();
      
      // Add style guidance to the prompt instead of using presetStyle
      // (presetStyle may not be supported for Phoenix 1.0)
      if (style) {
        const stylePrompts = {
          "ANIME": "anime style, ",
          "CARTOON": "cartoon style, animated, ",
          "WATERCOLOR": "watercolor painting style, ",
          "PIXEL": "pixel art style, 8-bit, ",
          "COMIC": "comic book style, graphic novel, ",
          "3D": "3D rendered, three-dimensional, ",
        };
        if (stylePrompts[style]) {
          enhancedPrompt = stylePrompts[style] + enhancedPrompt;
        }
      }
      
      const requestBody = {
        prompt: enhancedPrompt,
        modelId: this.modelId,
        width: this.#getWidth(aspectRatio),
        height: this.#getHeight(aspectRatio),
        num_images: 1,
        alchemy: true,
        enhancePrompt: true,
        // Removed contrast parameter - not supported by Phoenix 1.0
      };
      
      const generationResponse = await fetch(`${this.baseUrl}/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!generationResponse.ok) {
        let errorData = {};
        try {
          errorData = await generationResponse.json();
        } catch (e) {
          const text = await generationResponse.text().catch(() => "");
          console.error("[Leonardo API] Non-JSON error response:", text);
        }
        
        const errorMessage = errorData.error?.message || errorData.message || errorData.error || generationResponse.statusText;
        
        // Check for authentication errors
        if (generationResponse.status === 401 || generationResponse.status === 403) {
          throw new Error(`Leonardo API authentication failed (${generationResponse.status}). Please check your LEONARDO_API_KEY in the .env file. Error: ${errorMessage}`);
        }
        
        // Check for content moderation errors
        // Note: Leonardo AI has server-side content moderation that cannot be disabled via API
        // This is a limitation of Leonardo AI's service, not our code
        if (errorMessage?.toLowerCase().includes("moderated") || 
            errorMessage?.toLowerCase().includes("content") ||
            errorMessage?.toLowerCase().includes("safety") ||
            errorMessage?.toLowerCase().includes("blocked") ||
            errorMessage?.toLowerCase().includes("prohibited") ||
            errorMessage?.toLowerCase().includes("policy") ||
            errorMessage?.toLowerCase().includes("violation") ||
            errorMessage?.toLowerCase().includes("inappropriate")) {
          console.warn(`[Leonardo API] Content blocked by Leonardo AI's server-side moderation: ${errorMessage}`);
          console.warn(`[Leonardo API] This is a Leonardo AI limitation - their content moderation cannot be disabled via API`);
          throw new Error(`Content blocked by safety filters: PROHIBITED_CONTENT. Leonardo AI has mandatory server-side content moderation that cannot be disabled. This is a limitation of Leonardo AI's service. Please try with a different prompt, rephrase your content, or contact Leonardo AI support if you believe this is a false positive.`);
        }
        
        console.error("[Leonardo API] Error details:", {
          status: generationResponse.status,
          statusText: generationResponse.statusText,
          errorData,
          prompt: prompt.substring(0, 100),
        });
        throw new Error(`Leonardo API error (${generationResponse.status}): ${errorMessage}`);
      }

      const generationData = await generationResponse.json();
      console.log("[Leonardo API] Generation response:", JSON.stringify(generationData, null, 2));
      
      // Try different possible response structures
      const generationId = 
        generationData.sdGenerationJob?.generationId ||
        generationData.generationId ||
        generationData.id ||
        (generationData.sdGenerationJob && generationData.sdGenerationJob.id);

      if (!generationId) {
        console.error("[Leonardo API] Full response structure:", generationData);
        throw new Error(`Failed to get generation ID from Leonardo API. Response: ${JSON.stringify(generationData)}`);
      }
      
      console.log("[Leonardo API] Generation ID:", generationId);

      // Step 2: Poll for completion
      const imageUrl = await this.#pollForImage(generationId);

      // Step 3: Download and convert to base64
      console.log(`[Leonardo API] Downloading image from: ${imageUrl}`);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        // Check if image was blocked by content moderation
        if (imageResponse.status === 403 || imageResponse.status === 451) {
          console.warn(`[Leonardo API] Image download blocked (${imageResponse.status}) - Leonardo AI's server-side content moderation`);
          const errorText = await imageResponse.text().catch(() => "");
          console.warn(`[Leonardo API] Block reason: ${errorText.substring(0, 200)}`);
          throw new Error("Content blocked by safety filters: PROHIBITED_CONTENT. The generated image was blocked by Leonardo AI's mandatory server-side content moderation (this cannot be disabled). Please try with a different prompt or rephrase your content.");
        }
        const errorText = await imageResponse.text().catch(() => "");
        console.error(`[Leonardo API] Failed to download image (${imageResponse.status}):`, errorText);
        throw new Error(`Failed to download image: ${imageResponse.statusText}`);
      }

      try {
        const imageBuffer = await imageResponse.arrayBuffer();
        if (!imageBuffer || imageBuffer.byteLength === 0) {
          throw new Error("Downloaded image buffer is empty");
        }
        const base64 = Buffer.from(imageBuffer).toString("base64");
        if (!base64 || base64.length === 0) {
          throw new Error("Failed to convert image to base64");
        }
        const mimeType = imageResponse.headers.get("content-type") || "image/png";
        
        console.log(`[Leonardo API] Successfully downloaded and converted image (${base64.length} chars base64, ${imageBuffer.byteLength} bytes)`);

        return {
          imageData: base64,
          mimeType,
        };
      } catch (downloadError) {
        console.error(`[Leonardo API] Error processing downloaded image:`, downloadError);
        throw new Error(`Failed to process downloaded image: ${downloadError.message || downloadError}`);
      }
    } catch (error) {
      console.error("[Leonardo Image Generator] Error:", error);
      throw error;
    }
  }

  /**
   * Generate multiple images from prompts
   * @param {{ prompts: string[], aspectRatio?: string, style?: string }} params
   * @returns {Promise<Array<{ imageData: string, mimeType: string }>>}
   */
  async generateImages({ prompts, aspectRatio = "16:9", style, safetyFilterLevel }) {
    // Note: Leonardo AI doesn't support disabling content moderation via API
    // Content moderation is handled server-side by Leonardo
    // We can only improve error messages when content is blocked
    console.log(`[Leonardo] Starting batch generation for ${prompts.length} image(s)`);
    const results = await Promise.allSettled(
      prompts.map((prompt, index) => 
        this.generateImage({ prompt, aspectRatio, style })
          .catch((error) => {
            console.error(`[Leonardo] Image ${index + 1} failed for prompt "${prompt.substring(0, 50)}...":`, error.message || error);
            throw error; // Re-throw to preserve error in Promise.allSettled
          })
      )
    );

    const images = [];
    let successCount = 0;
    let failureCount = 0;
    const errors = [];
    
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        images.push(result.value);
        successCount++;
      } else {
        const errorMsg = result.reason?.message || String(result.reason);
        errors.push(`Image ${i + 1}: ${errorMsg}`);
        console.error(`[Leonardo] Image ${i + 1} generation failed:`, errorMsg);
        failureCount++;
      }
    }

    // If no images were generated successfully, throw an error with details
    if (images.length === 0) {
      const errorDetails = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '';
      throw new Error(`No images were generated successfully. All ${prompts.length} image(s) failed.${errorDetails} This may be due to content moderation, API errors, or invalid API key. Please check your Leonardo API key and try with a different story or adjust the content.`);
    }

    console.log(`[Leonardo] Successfully generated ${successCount}/${prompts.length} images`);
    if (failureCount > 0) {
      console.warn(`[Leonardo] ${failureCount} image(s) failed to generate`);
    }

    return images;
  }

  /**
   * Poll for image generation completion
   * @private
   */
  async #pollForImage(generationId, maxAttempts = 30, delay = 2000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Try both possible endpoint formats
      let statusResponse = await fetch(
        `${this.baseUrl}/generations/${generationId}`,
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
          },
        }
      );
      
      // If that fails, try the alternative endpoint
      if (!statusResponse.ok && statusResponse.status === 404) {
        statusResponse = await fetch(
          `${this.baseUrl}/generations/${generationId}/status`,
          {
            headers: {
              "Authorization": `Bearer ${this.apiKey}`,
            },
          }
        );
      }

      if (!statusResponse.ok) {
        throw new Error(`Failed to check generation status: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      console.log(`[Leonardo API] Poll attempt ${attempt + 1}/${maxAttempts}, status:`, JSON.stringify(statusData, null, 2));
      
      // Try different possible response structures
      const generations = 
        statusData.generations_by_pk?.generated_images ||
        statusData.generated_images ||
        statusData.generations ||
        (statusData.generations_by_pk && Array.isArray(statusData.generations_by_pk) ? statusData.generations_by_pk : []);

      if (generations && generations.length > 0) {
        const image = generations[0];
        
        // Check if image is marked as NSFW - log warning but still try to use it
        // Leonardo sometimes marks innocent images as NSFW (false positives)
        if (image.nsfw === true) {
          console.warn("[Leonardo API] Image marked as NSFW, but continuing anyway (may be false positive)");
          // Don't throw error - continue to download the image
          // If it's truly inappropriate, the download will fail
        }
        
        const imageUrl = image.url || image.imageUrl || image.downloadUrl;
        if (imageUrl) {
          console.log("[Leonardo API] Image URL found:", imageUrl);
          return imageUrl;
        } else {
          console.error("[Leonardo API] Image object found but no URL:", image);
        }
      }

      const status = 
        statusData.generations_by_pk?.status ||
        statusData.status ||
        statusData.generation?.status;

      if (status === "FAILED") {
        throw new Error("Image generation failed");
      }
      
      if (status === "COMPLETE" && generations && generations.length === 0) {
        // Sometimes the status is complete but images aren't in the expected location
        console.warn("[Leonardo API] Status is COMPLETE but no images found in expected location");
      }
    }

    throw new Error("Image generation timed out");
  }

  #getWidth(aspectRatio) {
    const ratios = {
      "16:9": 1024,
      "9:16": 576,
      "1:1": 1024,
      "4:3": 1024,
      "3:4": 768,
    };
    return ratios[aspectRatio] || 1024;
  }

  #getHeight(aspectRatio) {
    const ratios = {
      "16:9": 576,
      "9:16": 1024,
      "1:1": 1024,
      "4:3": 768,
      "3:4": 1024,
    };
    return ratios[aspectRatio] || 576;
  }
}




















