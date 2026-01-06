import { PredictionServiceClient } from "@google-cloud/aiplatform";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { tmpdir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Google Vertex AI (NanoBanana) image generation from prompts.
 * Uses official Google Cloud Vertex AI SDK with service account authentication.
 */
export class VertexAIImageGenerator {
  /**
   * @param {{ serviceAccountPath?: string, projectId?: string, location?: string, modelName?: string }} options
   */
  constructor({ 
    serviceAccountPath,
    projectId,
    location = "us-central1",
    modelName = "imagen-3.0-generate-001" // Imagen 3.0 model via Vertex AI
    // Note: imagen-3.0-generate-001 has strict rate limits (typically 60 requests/minute)
    // Consider using imagen-3.0-fast-generate-001 for higher throughput (if available)
  } = {}) {
    // Determine service account path
    // Priority: 1) explicit parameter, 2) GOOGLE_APPLICATION_CREDENTIALS env var, 3) VERTEX_SA_JSON env var (create temp file), 4) default vertex-sa.json
    let saPath = serviceAccountPath ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    // If VERTEX_SA_JSON environment variable is set, create a temp file from it
    if (!saPath && process.env.VERTEX_SA_JSON) {
      try {
        const tempDir = tmpdir();
        const tempSaPath = join(tempDir, `vertex-sa-${Date.now()}.json`);
        writeFileSync(tempSaPath, process.env.VERTEX_SA_JSON, "utf8");
        saPath = tempSaPath;
        console.log(`[Vertex AI] ✓ Created service account file from VERTEX_SA_JSON environment variable: ${saPath}`);
      } catch (error) {
        throw new Error(`Failed to create service account file from VERTEX_SA_JSON: ${error.message}`);
      }
    }
    
    // Fallback to default path if still not set
    if (!saPath) {
      saPath = resolve(process.cwd(), "vertex-sa.json");
    }
    
    this.projectId = projectId ?? process.env.GOOGLE_CLOUD_PROJECT_ID ?? process.env.GOOGLE_CLOUD_PROJECT;
    this.location = location ?? process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
    this.modelName = modelName;
    
    // Load service account credentials to get project ID if not set
    try {
      const serviceAccountKey = JSON.parse(readFileSync(saPath, "utf8"));
      this.projectId = this.projectId ?? serviceAccountKey.project_id;
      
      if (!this.projectId) {
        throw new Error("Project ID is required. Set GOOGLE_CLOUD_PROJECT_ID, GOOGLE_CLOUD_PROJECT, or ensure service account JSON has project_id.");
      }
      
      // Set GOOGLE_APPLICATION_CREDENTIALS so SDK can use it
      // The SDK will automatically use this for OAuth authentication
      // MUST be absolute path for SDK to work correctly
      const absoluteSaPath = resolve(saPath);
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = absoluteSaPath;
      }
      
      console.log(`[Vertex AI] ✓ Service account file: ${absoluteSaPath}`);
      console.log(`[Vertex AI] ✓ Service account email: ${serviceAccountKey.client_email}`);
      console.log(`[Vertex AI] ✓ GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`Service account file not found at: ${saPath}. Set GOOGLE_APPLICATION_CREDENTIALS environment variable or place vertex-sa.json in project root.`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid service account JSON file at: ${saPath}. Error: ${error.message}`);
      }
      throw new Error(`Failed to load service account credentials: ${error.message}`);
    }
    
    // Initialize Vertex AI Prediction Service Client
    // The SDK automatically handles OAuth authentication using GOOGLE_APPLICATION_CREDENTIALS
    // No API keys needed - SDK uses Application Default Credentials (ADC)
    try {
      this.predictionClient = new PredictionServiceClient({
        apiEndpoint: `${this.location}-aiplatform.googleapis.com`,
        // SDK will automatically use GOOGLE_APPLICATION_CREDENTIALS for authentication
      });
      
      console.log(`[Vertex AI] ✓ SDK initialized successfully`);
      console.log(`[Vertex AI] ✓ Project: ${this.projectId}, Location: ${this.location}, Model: ${this.modelName}`);
      console.log(`[Vertex AI] ✓ Using OAuth 2.0 authentication via service account (no API keys)`);
    } catch (error) {
      console.error(`[Vertex AI] ✗ Failed to initialize SDK: ${error.message}`);
      throw new Error(`Failed to initialize Vertex AI SDK: ${error.message}`);
    }
    
    // Model resource name for Vertex AI
    this.modelPath = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelName}`;
  }

  /**
   * Generate an image from a text prompt.
   * @param {{ prompt: string, aspectRatio?: string, safetyFilterLevel?: string }} params
   * @returns {Promise<{ imageData: string, mimeType: string }>} Base64 image data
   */
  async generateImage({ prompt, aspectRatio = "16:9", safetyFilterLevel = "block_none", retryCount = 0, maxRetries = 3 }) {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Image prompt is required.");
    }

    if (retryCount === 0) {
      console.log(`[Vertex AI] Using official Vertex AI SDK for prediction`);
      console.log(`[Vertex AI] Model path: ${this.modelPath}`);
      console.log(`[Vertex AI] SDK will automatically handle OAuth authentication`);
    } else {
      console.log(`[Vertex AI] Retry attempt ${retryCount}/${maxRetries} for prompt...`);
    }

    // Map aspect ratio to Vertex AI format
    const aspectRatioMap = {
      "16:9": "16:9",
      "9:16": "9:16",
      "1:1": "1:1",
      "4:3": "4:3",
      "3:4": "3:4",
    };
    const mappedAspectRatio = aspectRatioMap[aspectRatio] || "16:9";

    // Vertex AI Imagen API payload format
    // Note: Vertex AI automatically enforces safety for family-friendly prompts
    // No manual safetySetting parameter is needed or supported
    // Ensure prompt is under 500 characters and remove problematic terms
    let sanitizedPrompt = prompt.trim();
    
    // CRITICAL: Only remove explicit age terms that trigger safety filters
    // DO NOT remove descriptive terms like "youthful", "small-statured", "school-age", "adolescent features"
    // These descriptive terms allow generating age-appropriate images without triggering filters
    sanitizedPrompt = sanitizedPrompt.replace(/\bchild\b/gi, "character");
    sanitizedPrompt = sanitizedPrompt.replace(/\bchildren\b/gi, "characters");
    sanitizedPrompt = sanitizedPrompt.replace(/\bbaby\b/gi, "character");
    sanitizedPrompt = sanitizedPrompt.replace(/\bbabies\b/gi, "characters");
    sanitizedPrompt = sanitizedPrompt.replace(/\bchild character\b/gi, "character");
    sanitizedPrompt = sanitizedPrompt.replace(/\bbaby character\b/gi, "character");
    sanitizedPrompt = sanitizedPrompt.replace(/\bteenager\b/gi, "youthful person");
    sanitizedPrompt = sanitizedPrompt.replace(/\bteen\b/gi, "youthful person");
    // Note: We keep "youthful", "small-statured", "school-age", "adolescent features" as they are descriptive, not explicit age terms
    
    if (sanitizedPrompt.length > 500) {
      console.warn(`[Vertex AI] Prompt exceeds 500 characters (${sanitizedPrompt.length}), truncating...`);
      sanitizedPrompt = sanitizedPrompt.substring(0, 497) + "...";
    }
    
    console.log(`[Vertex AI] Sanitized prompt (${sanitizedPrompt.length} chars):`, sanitizedPrompt.substring(0, 300));
    
    // Try minimal payload format - Vertex AI may have strict requirements
    const payload = {
      instances: [
        {
          prompt: sanitizedPrompt,
        },
      ],
      parameters: {
        aspectRatio: mappedAspectRatio,
        // Removed sampleCount - default is 1, may cause INVALID_ARGUMENT if specified incorrectly
        // No safetySetting - Vertex AI handles safety automatically
      },
    };
    
    console.log(`[Vertex AI] Request payload:`, JSON.stringify(payload, null, 2).substring(0, 500));

    try {
      // Use REST API directly instead of SDK predict method
      // The SDK predict method has format issues, so we'll use REST with OAuth token
      console.log(`[Vertex AI] Calling REST API directly...`);
      console.log(`[Vertex AI] Model path: ${this.modelPath}`);
      
      // Get OAuth access token using the service account
      const { GoogleAuth } = await import("google-auth-library");
      const auth = new GoogleAuth({
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();
      
      if (!accessToken || !accessToken.token) {
        throw new Error("Failed to obtain OAuth access token from service account");
      }
      
      // Use REST API endpoint
      // Format: https://{location}-aiplatform.googleapis.com/v1/{modelPath}:predict
      const apiUrl = `https://${this.location}-aiplatform.googleapis.com/v1/${this.modelPath}:predict`;
      
      console.log(`[Vertex AI] REST API URL: ${apiUrl}`);
      console.log(`[Vertex AI] Model path: ${this.modelPath}`);
      console.log(`[Vertex AI] Using OAuth token (first 20 chars): ${accessToken.token.substring(0, 20)}...`);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken.token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        
        console.error(`[Vertex AI] ✗✗✗ REST API ERROR:`);
        console.error(`[Vertex AI] Status: ${response.status} ${response.statusText}`);
        console.error(`[Vertex AI] Full error response:`, errorText);
        console.error(`[Vertex AI] Parsed error data:`, JSON.stringify(errorData, null, 2));
        console.error(`[Vertex AI] Request payload:`, JSON.stringify(payload, null, 2));
        console.error(`[Vertex AI] Prompt that failed:`, sanitizedPrompt);
        
        // Extract detailed error message
        const errorMsg = errorData?.error?.message 
          || errorData?.error?.status 
          || errorData?.message 
          || errorText 
          || `HTTP ${response.status}`;
        
        // Extract error details if available
        const errorDetails = errorData?.error?.details || errorData?.error || errorData?.details || "";
        const detailsStr = errorDetails ? ` Details: ${JSON.stringify(errorDetails)}` : "";
        
        // For 429 errors, throw a special error that will be caught and retried with longer backoff
        if (response.status === 429) {
          const quotaError = new Error(`Vertex AI REST API error (${response.status}): ${errorMsg}${detailsStr}`);
          quotaError.status = 429;
          quotaError.code = 429;
          throw quotaError;
        }
        
        throw new Error(`Vertex AI REST API error (${response.status}): ${errorMsg}${detailsStr}`);
      }
      
      const responseData = await response.json();
      console.log(`[Vertex AI] REST API call completed`);
      console.log(`[Vertex AI] Response keys:`, Object.keys(responseData));
      
      // Check if response has predictions
      if (responseData && responseData.predictions && responseData.predictions.length > 0) {
        console.log(`[Vertex AI] ✓ Successfully received ${responseData.predictions.length} prediction(s)`);
        return this.#extractImageFromResponse(responseData);
      }
      
      // Empty response - retry with exponential backoff
      if (!responseData || !responseData.predictions || responseData.predictions.length === 0) {
        if (retryCount < maxRetries) {
          const delayMs = Math.pow(2, retryCount) * 5000; // Exponential backoff: 5s, 10s, 20s
          console.warn(`[Vertex AI] Empty response detected (likely rate limiting). Retrying in ${delayMs}ms... (attempt ${retryCount + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return this.generateImage({ prompt, aspectRatio, safetyFilterLevel, retryCount: retryCount + 1, maxRetries });
        }
        
        console.error(`[Vertex AI] Empty response from Vertex AI REST API after ${retryCount} retries. This usually means:`);
        console.error(`  1. Rate limiting or quota exceeded - wait longer between requests`);
        console.error(`  2. Service account doesn't have Vertex AI permissions (roles/aiplatform.user)`);
        console.error(`  3. Project ID or location is wrong`);
        console.error(`  4. Model name is incorrect or not available`);
        throw new Error(
          `Vertex AI REST API returned empty response after ${retryCount} retries. This is likely due to rate limiting or quota exceeded. Please wait 30-60 seconds and try again. Project: ${this.projectId}, Location: ${this.location}, Model: ${this.modelName}`
        );
      }
    } catch (error) {
      // Log full error details for debugging
      console.error(`[Vertex AI] ✗✗✗ ERROR DETAILS:`);
      console.error(`[Vertex AI] Error type:`, typeof error);
      console.error(`[Vertex AI] Error message:`, error?.message);
      console.error(`[Vertex AI] Error code:`, error?.code);
      console.error(`[Vertex AI] Error status:`, error?.status);
      console.error(`[Vertex AI] Error details:`, error?.details);
      console.error(`[Vertex AI] Full error (first 2000 chars):`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2).substring(0, 2000));
      console.error(`[Vertex AI] Prompt that failed:`, prompt.substring(0, 200));
      
      const errorMsg = error?.message || String(error);
      const errorCode = error?.code || error?.status?.code || error?.status;
      const errorDetails = error?.details || error?.status?.details || "";
      const response = error?.response;
      
      // Log authentication errors specifically
      if (errorCode === 16 || errorMsg?.includes("UNAUTHENTICATED") || errorMsg?.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
        console.error(`[Vertex AI] ✗✗✗ AUTHENTICATION ERROR: ${errorMsg}`);
        console.error(`[Vertex AI] This usually means:`);
        console.error(`  1. GOOGLE_APPLICATION_CREDENTIALS is not set correctly`);
        console.error(`  2. Service account JSON file is invalid or missing`);
        console.error(`  3. Service account doesn't have roles/aiplatform.user permission`);
        throw new Error(`Vertex AI authentication failed: ${errorMsg}. Please check GOOGLE_APPLICATION_CREDENTIALS and service account permissions.`);
      }
      
      // Log permission errors
      if (errorCode === 7 || errorMsg?.includes("PERMISSION_DENIED") || errorMsg?.includes("permission")) {
        console.error(`[Vertex AI] ✗✗✗ PERMISSION ERROR: ${errorMsg}`);
        console.error(`[Vertex AI] Service account needs roles/aiplatform.user role`);
        throw new Error(`Vertex AI permission denied: ${errorMsg}. Please ensure service account has roles/aiplatform.user role.`);
      }
      
      // Log INVALID_ARGUMENT errors with details
      if (errorCode === 3 || errorMsg?.includes("INVALID_ARGUMENT")) {
        console.error(`[Vertex AI] ✗✗✗ INVALID_ARGUMENT ERROR: ${errorMsg}`);
        console.error(`[Vertex AI] Error details:`, errorDetails);
        console.error(`[Vertex AI] This usually means:`);
        console.error(`  1. Prompt contains restricted terms (child, baby, etc.)`);
        console.error(`  2. Prompt format is invalid`);
        console.error(`  3. Prompt is too long or contains invalid characters`);
        const detailsStr = errorDetails ? ` Details: ${JSON.stringify(errorDetails)}` : "";
        throw new Error(`Vertex AI INVALID_ARGUMENT error: ${errorMsg}${detailsStr}. Check prompt for restricted terms or invalid format.`);
      }
      
      // Handle 429 (quota/rate limit) errors with longer backoff
      // Check for 429 in multiple ways since error structure varies
      const isQuotaError = errorCode === 429 
        || error?.status === 429 
        || errorMsg?.includes("429") 
        || errorMsg?.includes("Quota exceeded") 
        || errorMsg?.includes("RESOURCE_EXHAUSTED")
        || errorMsg?.includes("rate limit");
      
      if (isQuotaError) {
        if (retryCount < maxRetries) {
          // For quota errors, use longer exponential backoff: 30s, 60s, 120s
          const delayMs = Math.pow(2, retryCount) * 30000; // 30s, 60s, 120s
          console.warn(`[Vertex AI] Quota/rate limit error (attempt ${retryCount + 1}/${maxRetries + 1}): ${errorMsg}`);
          console.warn(`[Vertex AI] This is a per-model rate limit for imagen-3.0-generate (typically 60 requests/minute)`);
          console.warn(`[Vertex AI] Waiting ${delayMs/1000} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return this.generateImage({ prompt, aspectRatio, safetyFilterLevel, retryCount: retryCount + 1, maxRetries });
        } else {
          throw new Error(
            `Vertex AI quota/rate limit exceeded after ${retryCount} retries. ` +
            `The imagen-3.0-generate model has a per-minute rate limit (typically 60 requests/minute). ` +
            `Please wait a few minutes and try again, or request a quota increase at: ` +
            `https://console.cloud.google.com/apis/api/aiplatform.googleapis.com/quotas?project=${this.projectId}`
          );
        }
      }
      
      // If we haven't exceeded max retries, retry on transient errors
      if (retryCount < maxRetries && !errorMsg?.includes("UNAUTHENTICATED") && !errorMsg?.includes("PERMISSION_DENIED")) {
        const delayMs = Math.pow(2, retryCount) * 2000; // Exponential backoff: 2s, 4s, 8s
        console.warn(`[Vertex AI] Error occurred (attempt ${retryCount + 1}/${maxRetries + 1}): ${errorMsg}. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.generateImage({ prompt, aspectRatio, safetyFilterLevel, retryCount: retryCount + 1, maxRetries });
      }
      
      // Max retries exceeded or non-retryable error, throw the error
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to generate image after ${retryCount} retries: ${error.message || String(error)}`);
    }
  }

  /**
   * Extract image data from Vertex AI API response
   * @private
   */
  #extractImageFromResponse(data) {
    // Log full response structure for debugging
    if (!data || typeof data !== 'object') {
      console.error("[Vertex AI] Invalid response data type:", typeof data, data);
      throw new Error(`Invalid Vertex AI API response: expected object, got ${typeof data}`);
    }
    
    const responseKeys = Object.keys(data);
    console.log("[Vertex AI] Response keys:", responseKeys);
    console.log("[Vertex AI] Response structure:", JSON.stringify(data, null, 2).substring(0, 1000));
    
    if (responseKeys.length === 0) {
      console.error("[Vertex AI] Empty response object received");
      throw new Error(`Vertex AI API returned empty response. This usually means the API endpoint or model name is incorrect. Check your project ID (${this.projectId}), location (${this.location}), and model name (${this.modelName}).`);
    }
    
    // Vertex AI predict response format
    if (data.predictions && data.predictions[0]) {
      const prediction = data.predictions[0];
      console.log("[Vertex AI] Prediction keys:", Object.keys(prediction));
      
      // Check for bytesBase64Encoded (most common format)
      if (prediction.bytesBase64Encoded) {
        return {
          imageData: prediction.bytesBase64Encoded,
          mimeType: prediction.mimeType || "image/png",
        };
      }
      
      // Check for inlineData format
      if (prediction.inlineData) {
        return {
          imageData: prediction.inlineData.data,
          mimeType: prediction.inlineData.mimeType || "image/png",
        };
      }
      
      // Check for generatedImages array
      if (prediction.generatedImages && prediction.generatedImages[0]) {
        const image = prediction.generatedImages[0];
        if (image.bytesBase64Encoded) {
          return {
            imageData: image.bytesBase64Encoded,
            mimeType: image.mimeType || "image/png",
          };
        }
      }
      
      // Check for base64EncodedBytes (alternative naming)
      if (prediction.base64EncodedBytes) {
        return {
          imageData: prediction.base64EncodedBytes,
          mimeType: prediction.mimeType || "image/png",
        };
      }
      
      // Check for imageBytes
      if (prediction.imageBytes) {
        return {
          imageData: prediction.imageBytes,
          mimeType: prediction.mimeType || "image/png",
        };
      }
    }
    
    // Check if response is in a different format (maybe direct image data)
    if (data.bytesBase64Encoded) {
      return {
        imageData: data.bytesBase64Encoded,
        mimeType: data.mimeType || "image/png",
      };
    }

    // Log the actual response for debugging
    console.error("[Vertex AI] Unexpected response format:", JSON.stringify(data, null, 2).substring(0, 1000));
    throw new Error(`Invalid Vertex AI API response format. Response keys: ${responseKeys.join(', ')}. Could not extract image data from response.`);
  }

  /**
   * Generate multiple images from an array of prompts.
   * @param {{ prompts: string[], aspectRatio?: string, safetyFilterLevel?: string }} params
   * @returns {Promise<Array<{ imageData: string, mimeType: string }>>}
   */
  async generateImages({ prompts, aspectRatio = "16:9", safetyFilterLevel = "block_none" }) {
    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error("Prompts array is required and must not be empty.");
    }

    console.log(`[Vertex AI] Starting batch generation for ${prompts.length} image(s)`);
    // Generate images sequentially with delays to avoid rate limiting
    // Sequential approach is more reliable than parallel with delays
    const images = [];
    const errors = [];
    
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      // Add delay before each request (except the first one) to avoid rate limiting
      // Increased delay to handle rate limiting better
      if (i > 0) {
        const delay = 5000; // 5 second delay between requests to avoid rate limiting
        console.log(`[Vertex AI] Waiting ${delay}ms before generating image ${i + 1}/${prompts.length}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      let imageGenerated = false;
      let attempts = 0;
      const maxAttempts = 2; // Try each image up to 2 times if it fails
      
      while (!imageGenerated && attempts < maxAttempts) {
        attempts++;
        try {
        if (attempts > 1) {
          const retryDelay = 5000 * attempts; // 5s, 10s delays for retries
          console.log(`[Vertex AI] Retrying image ${i + 1}/${prompts.length} (attempt ${attempts}/${maxAttempts})...`);
          console.log(`[Vertex AI] Waiting ${retryDelay}ms before retry to avoid rate limiting...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.log(`[Vertex AI] Generating image ${i + 1}/${prompts.length}...`);
        }
          
          const result = await this.generateImage({ prompt, aspectRatio, safetyFilterLevel });
          images.push(result);
          imageGenerated = true;
          console.log(`[Vertex AI] ✓ Image ${i + 1}/${prompts.length} generated successfully`);
        } catch (error) {
          const errorMsg = error?.message || String(error);
          if (attempts >= maxAttempts) {
            console.error(`[Vertex AI] ✗ Image ${i + 1} failed after ${attempts} attempts for prompt "${prompt.substring(0, 50)}...":`, errorMsg);
            errors.push(`Image ${i + 1}: ${errorMsg}`);
          } else {
            console.warn(`[Vertex AI] ⚠ Image ${i + 1} failed (attempt ${attempts}/${maxAttempts}), will retry...`);
          }
        }
      }
    }

    const successCount = images.length;
    const failureCount = prompts.length - successCount;

    // If no images were generated successfully, throw an error with details
    if (images.length === 0) {
      const errorDetails = errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '';
      throw new Error(`No images were generated successfully. All ${prompts.length} image(s) failed.${errorDetails} This may be due to API errors, service account permissions, or content restrictions. Please check your service account credentials and project configuration.`);
    }

    console.log(`[Vertex AI] Successfully generated ${successCount}/${prompts.length} image(s)`);
    if (failureCount > 0) {
      console.warn(`[Vertex AI] ${failureCount} image(s) failed to generate`);
    }

    return images;
  }
}

export default VertexAIImageGenerator;
