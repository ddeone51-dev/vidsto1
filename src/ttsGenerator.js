import gTTS from "gtts";
import { Readable } from "stream";
import { promisify } from "util";

/**
 * Text-to-Speech narration generator using gTTS (Google Text-to-Speech).
 * For production, consider using Google Cloud Text-to-Speech API for higher quality.
 */
export class TTSGenerator {
  /**
   * @param {{ apiKey?: string, provider?: 'gtts' | 'gcp' }} options
   */
  constructor({ apiKey, provider = "gtts" } = {}) {
    this.apiKey = apiKey ?? process.env.GOOGLE_API_KEY;
    this.provider = provider;

    if (provider === "gcp" && !this.apiKey) {
      throw new Error("Google Cloud API key required for GCP TTS provider.");
    }
  }

  /**
   * Generate audio narration from text script.
   * @param {{ text: string, language?: string, voice?: string, speed?: number, audioOnly?: boolean }} params
   * @returns {Promise<{ audioData: ArrayBuffer, mimeType: string, format: string, duration?: number, timeMarks?: Array<{markName: string, timeSeconds: number}> }>}
   */
  async generateAudio({ text, language = "en", voice, speed = 1.0, audioOnly = false }) {
    if (!text || typeof text !== "string" || !text.trim()) {
      throw new Error("Text script is required for TTS generation.");
    }

    let result;
    if (this.provider === "gcp") {
      result = await this.#generateWithGCP({ text, language, voice, speed });
    } else {
      result = await this.#generateWithGTTS({ text, language, voice, speed });
    }

    // Estimate duration: average speaking rate is ~150 words per minute
    const wordCount = text.trim().split(/\s+/).length;
    const estimatedDurationSeconds = (wordCount / 150) * 60 / speed;
    
    return {
      ...result,
      duration: estimatedDurationSeconds,
    };
  }

  /**
   * Generate audio using Google Cloud Text-to-Speech API.
   * @private
   */
  async #generateWithGCP({ text, language, voice, speed }) {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;
    
    // Normalize language code (e.g., "sw" -> "sw-KE", "en" -> "en-US")
    const normalizedLang = this.#normalizeLanguageCode(language);
    
    // Only use voice if it matches the language, otherwise use default for that language
    let voiceName = this.#getDefaultVoice(normalizedLang);
    if (voice) {
      // Check if voice matches the language (voice names start with language code)
      const voiceLang = voice.split("-").slice(0, 2).join("-");
      const langPrefix = normalizedLang.split("-").slice(0, 2).join("-");
      if (voiceLang.toLowerCase() === langPrefix.toLowerCase()) {
        voiceName = voice;
      }
    }
    
    // Build voice object - only include name if we have a valid voice
    const voiceObj = {
      languageCode: normalizedLang,
      ssmlGender: "NEUTRAL",
    };
    
    // Only add name if we have a valid voice (not null)
    if (voiceName) {
      voiceObj.name = voiceName;
    }
    
    // Build SSML - simple text input (no time marks needed, timing handled by frontend)
    // Escape XML special characters for SSML
    const escapeXml = (str) => {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };
    
    const ssmlText = `<speak>${escapeXml(text)}</speak>`;
    
    const payload = {
      input: { ssml: ssmlText },
      voice: voiceObj,
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: speed,
        pitch: 0,
        volumeGainDb: 0,
        // Note: Google Cloud TTS API doesn't provide word-level timing
        // We use Speech-to-Text API to analyze the generated audio for exact timestamps
      },
    };

    // CRITICAL: Verify payload doesn't contain enableTimePointing
    const payloadStr = JSON.stringify(payload);
    console.log("[TTS] Payload being sent to Google Cloud TTS API:");
    console.log("[TTS] Payload keys:", Object.keys(payload));
    console.log("[TTS] audioConfig keys:", Object.keys(payload.audioConfig));
    
    if (payloadStr.includes("enableTimePointing")) {
      console.error("[TTS] ❌ ERROR: Payload contains enableTimePointing!");
      console.error("[TTS] Full payload:", payloadStr);
      throw new Error("Payload contains invalid enableTimePointing field - this should not happen!");
    }
    
    console.log("[TTS] ✓ Payload verified - no enableTimePointing field");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payloadStr,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `TTS API error (${response.status}): ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      
      if (!data.audioContent) {
        throw new Error("Invalid TTS API response format.");
      }

      // Decode base64 audio content
      const audioBuffer = Buffer.from(data.audioContent, "base64");
      
      console.log(`[TTS] Generated audio buffer size: ${audioBuffer.length} bytes`);
      
      // Note: Google Cloud TTS API doesn't provide word-level timing in standard response
      // We'll use Speech-to-Text API in the server endpoint to analyze audio and get exact timestamps
      // Return Buffer directly (not .buffer property) so Speech-to-Text can use it correctly
      
      return {
        audioData: audioBuffer, // Return Buffer directly, not audioBuffer.buffer
        mimeType: "audio/mpeg",
        format: "mp3",
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to generate TTS audio: ${error.message || String(error)}`);
    }
  }

  /**
   * Generate audio using gTTS (Google Text-to-Speech web service).
   * @private
   */
  async #generateWithGTTS({ text, language, voice, speed }) {
    try {
      // Map language codes: en-US -> en, es-ES -> es, etc.
      const langCode = language.split("-")[0].toLowerCase();
      
      // Create gTTS instance
      const tts = new gTTS(text.trim(), langCode);
      
      // Convert stream to buffer using Promise-based approach
      return new Promise((resolve, reject) => {
        const chunks = [];
        const stream = tts.stream();
        
        stream.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        stream.on('end', () => {
          try {
            const audioBuffer = Buffer.concat(chunks);
            // Convert Buffer to ArrayBuffer
            const arrayBuffer = audioBuffer.buffer.slice(
              audioBuffer.byteOffset,
              audioBuffer.byteOffset + audioBuffer.byteLength
            );

            resolve({
              audioData: arrayBuffer || new Uint8Array(audioBuffer).buffer,
              mimeType: "audio/mpeg",
              format: "mp3",
            });
          } catch (err) {
            reject(new Error(`Failed to process audio buffer: ${err.message}`));
          }
        });
        
        stream.on('error', (err) => {
          reject(new Error(`gTTS stream error: ${err.message}`));
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`gTTS generation failed: ${error.message}`);
      }
      throw new Error(`Failed to generate TTS audio: ${String(error)}`);
    }
  }

  /**
   * Normalize language code to full BCP-47 format
   * @private
   */
  #normalizeLanguageCode(lang) {
    const langMap = {
      "sw": "sw-KE",
      "en": "en-US",
      "es": "es-ES",
      "fr": "fr-FR",
      "de": "de-DE",
      "ja": "ja-JP",
      "hi": "hi-IN",
    };
    
    // If it's already in full format, return as-is
    if (lang.includes("-")) {
      return lang;
    }
    
    // Map short codes to full format
    return langMap[lang.toLowerCase()] || "en-US";
  }

  /**
   * Get default voice for a language code.
   * @private
   */
  #getDefaultVoice(languageCode) {
    const voices = {
      "en-US": "en-US-Neural2-F",
      "en-GB": "en-GB-Neural2-B",
      "es-ES": "es-ES-Neural2-F",
      "fr-FR": "fr-FR-Neural2-C",
      "de-DE": "de-DE-Neural2-F",
      "ja-JP": "ja-JP-Neural2-B",
      "hi-IN": "hi-IN-Neural2-D",
      "sw-KE": null, // Swahili - let API auto-select
    };
    return voices[languageCode] || null; // Return null to let API auto-select
  }
}

export default TTSGenerator;

