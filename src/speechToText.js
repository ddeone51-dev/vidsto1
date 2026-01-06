/**
 * Google Cloud Speech-to-Text API integration for word-level timing extraction.
 * This is used to get exact word timestamps from audio for accurate subtitle synchronization.
 */
export class SpeechToText {
  /**
   * @param {{ apiKey?: string }} options
   */
  constructor({ apiKey } = {}) {
    this.apiKey = apiKey ?? process.env.GOOGLE_API_KEY;
    
    if (!this.apiKey) {
      throw new Error("Google API key required for Speech-to-Text.");
    }
  }

  /**
   * Transcribe audio and get word-level timestamps.
   * @param {{ audioData: ArrayBuffer | Buffer, mimeType: string, language?: string }} params
   * @returns {Promise<Array<{ word: string, startTime: number, endTime: number }>>}
   */
  async transcribeWithTimestamps({ audioData, mimeType, language = "en-US" }) {
    if (!audioData) {
      throw new Error("Audio data is required for transcription.");
    }

    // Normalize language code
    const normalizedLang = this.#normalizeLanguageCode(language);
    console.log(`[Speech-to-Text] Input language: "${language}" -> Normalized: "${normalizedLang}"`);
    
    // Convert audio to Buffer if needed
    let audioBuffer;
    let audioSizeBytes;
    if (audioData instanceof Buffer) {
      audioBuffer = audioData;
      audioSizeBytes = audioData.length;
    } else if (audioData instanceof ArrayBuffer) {
      audioBuffer = Buffer.from(audioData);
      audioSizeBytes = audioBuffer.length;
    } else {
      throw new Error(`Unsupported audio data format. Received type: ${typeof audioData}, constructor: ${audioData?.constructor?.name}`);
    }
    
    console.log(`[Speech-to-Text] Audio data type: ${audioData instanceof Buffer ? 'Buffer' : audioData instanceof ArrayBuffer ? 'ArrayBuffer' : typeof audioData}`);
    console.log(`[Speech-to-Text] Audio size: ${audioSizeBytes} bytes (${(audioSizeBytes / 1024).toFixed(2)} KB)`);
    
    // Validate audio size - too small might be empty or corrupted
    if (audioSizeBytes < 100) {
      throw new Error(`Audio data is too small (${audioSizeBytes} bytes). Audio might be empty or corrupted.`);
    }

    const url = `https://speech.googleapis.com/v1/speech:recognize?key=${this.apiKey}`;
    
    // Google Speech-to-Text API configuration
    // For MP3 files, we need to omit encoding and sampleRateHertz to let API auto-detect
    // Or specify MP3 with a valid sample rate (typically 44100 for MP3)
    const config = {
      languageCode: normalizedLang,
      enableWordTimeOffsets: true, // CRITICAL: Enable word-level timestamps
      enableAutomaticPunctuation: true,
    };
    
    // Only add model if it's supported for the language
    // Some languages (like Swahili sw-KE) don't support latest_long model
    // For those languages, we omit the model parameter and let API use the default model
    // Common languages that support latest_long: en-US, es-ES, fr-FR, etc.
    const supportedLatestLongLanguages = ["en-US", "en-GB", "es-ES", "fr-FR", "de-DE", "ja-JP", "hi-IN", "zh-CN"];
    if (supportedLatestLongLanguages.includes(normalizedLang)) {
      config.model = "latest_long"; // Use latest model for better accuracy (only for supported languages)
      console.log(`[Speech-to-Text] Using latest_long model for ${normalizedLang}`);
    } else {
      console.log(`[Speech-to-Text] Omitting model parameter for ${normalizedLang} - will use default model (latest_long not supported for this language)`);
    }
    // For other languages (like Swahili), omit model to use default - this is correct!
    
    // CRITICAL: When enableWordTimeOffsets is true, encoding MUST be explicitly set
    // Auto-detection does NOT work reliably for MP3, especially with Swahili and word timestamps
    // For MP3 files, we must explicitly set encoding="MP3" (do NOT set sampleRateHertz unless known exactly)
    if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
      // Explicitly set MP3 encoding - REQUIRED when enableWordTimeOffsets is true
      // Do NOT set sampleRateHertz - let API handle it
      config.encoding = "MP3";
      console.log(`[Speech-to-Text] ⚠ CRITICAL: Explicitly setting MP3 encoding (required for word timestamps)`);
      console.log(`[Speech-to-Text] ⚠ Auto-detection does NOT work reliably for MP3 with word timestamps`);
    } else if (mimeType.includes("wav") || mimeType.includes("linear")) {
      config.encoding = "LINEAR16";
      config.sampleRateHertz = 16000;
      console.log(`[Speech-to-Text] Using LINEAR16 encoding with 16000 Hz sample rate`);
    } else if (mimeType.includes("ogg") || mimeType.includes("opus")) {
      config.encoding = "OGG_OPUS";
      console.log(`[Speech-to-Text] Using OGG_OPUS encoding`);
    } else if (mimeType.includes("flac")) {
      config.encoding = "FLAC";
      console.log(`[Speech-to-Text] Using FLAC encoding`);
    } else {
      // Default to MP3 if format is unknown (most TTS APIs output MP3)
      config.encoding = "MP3";
      console.log(`[Speech-to-Text] Unknown format "${mimeType}", defaulting to MP3 encoding`);
    }
    
    // Convert audio buffer to base64
    const audioBase64 = audioBuffer.toString("base64");
    
    const payload = {
      config: config,
      audio: {
        content: audioBase64,
      },
    };
    
    console.log(`[Speech-to-Text] Payload config:`, JSON.stringify(config, null, 2));
    console.log(`[Speech-to-Text] Audio content length: ${audioBase64.length} characters (base64)`);
    console.log(`[Speech-to-Text] Audio size: ${audioBuffer.length} bytes (${(audioBuffer.length / 1024).toFixed(2)} KB)`);
    
    console.log(`[Speech-to-Text] Requesting transcription: language=${normalizedLang}, encoding=${config.encoding}, sampleRate=${config.sampleRateHertz || 'not set'}, size=${audioBuffer.length} bytes`);
    console.log(`[Speech-to-Text] Payload config:`, JSON.stringify(payload.config, null, 2));

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Speech-to-Text] API Error Response (${response.status}):`, errorText.substring(0, 500));
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText } };
        }
        throw new Error(
          `Speech-to-Text API error (${response.status}): ${errorData.error?.message || errorData.message || response.statusText}`
        );
      }

      const data = await response.json();
      console.log(`[Speech-to-Text] API Response received`);
      console.log(`[Speech-to-Text] Response keys:`, Object.keys(data));
      console.log(`[Speech-to-Text] Has results:`, !!data.results);
      console.log(`[Speech-to-Text] Results length:`, data.results?.length || 0);
      
      // Log full transcription text for verification
      if (data.results && data.results.length > 0) {
        const fullTranscript = data.results
          .map(result => result.alternatives?.[0]?.transcript || '')
          .filter(t => t.length > 0)
          .join(' ');
        console.log(`[Speech-to-Text] ⚠ CRITICAL: Full transcription: "${fullTranscript}"`);
        console.log(`[Speech-to-Text] ⚠ Transcription language: ${normalizedLang}`);
        console.log(`[Speech-to-Text] ⚠ If transcription is wrong, verify language code matches audio language`);
        console.log(`[Speech-to-Text] ⚠ Input language was: "${language}" -> Normalized to: "${normalizedLang}"`);
      }
      
      if (data.results && data.results.length > 0) {
        console.log(`[Speech-to-Text] First result keys:`, Object.keys(data.results[0]));
        console.log(`[Speech-to-Text] First result has alternatives:`, !!data.results[0].alternatives);
        if (data.results[0].alternatives && data.results[0].alternatives.length > 0) {
          console.log(`[Speech-to-Text] First alternative keys:`, Object.keys(data.results[0].alternatives[0]));
          console.log(`[Speech-to-Text] First alternative has words:`, !!data.results[0].alternatives[0].words);
          console.log(`[Speech-to-Text] Words count:`, data.results[0].alternatives[0].words?.length || 0);
          if (data.results[0].alternatives[0].words && data.results[0].alternatives[0].words.length > 0) {
            console.log(`[Speech-to-Text] First word structure:`, JSON.stringify(data.results[0].alternatives[0].words[0], null, 2));
          }
        }
      }
      
      // Check if API returned results
      if (!data.results || data.results.length === 0) {
        console.error(`[Speech-to-Text] ❌ No transcription results in API response`);
        console.error(`[Speech-to-Text] Full response:`, JSON.stringify(data, null, 2));
        console.error(`[Speech-to-Text] This usually means:`);
        console.error(`[Speech-to-Text]   1. Audio is too short or silent`);
        console.error(`[Speech-to-Text]   2. Audio format not recognized`);
        console.error(`[Speech-to-Text]   3. Language code mismatch`);
        console.error(`[Speech-to-Text]   4. Audio content is corrupted`);
        
        // Check if there's an error in the response
        if (data.error) {
          throw new Error(`Speech-to-Text API error: ${JSON.stringify(data.error)}`);
        }
        
        // If we have requestId but no results, the audio might be too short or unrecognizable
        if (data.requestId) {
          throw new Error("No transcription results returned from Speech-to-Text API. The audio might be too short, silent, or in an unrecognized format. Response: " + JSON.stringify(data).substring(0, 500));
        }
        
        throw new Error("No transcription results returned from Speech-to-Text API. Response: " + JSON.stringify(data).substring(0, 500));
      }

      // Extract word-level timestamps from all alternatives
      const words = [];
      for (let i = 0; i < data.results.length; i++) {
        const result = data.results[i];
        console.log(`[Speech-to-Text] Processing result ${i + 1}/${data.results.length}`);
        console.log(`[Speech-to-Text] Result keys:`, Object.keys(result));
        console.log(`[Speech-to-Text] Has alternatives:`, !!result.alternatives, `count:`, result.alternatives?.length || 0);
        
        if (result.alternatives && result.alternatives.length > 0) {
          const alternative = result.alternatives[0];
          console.log(`[Speech-to-Text] Alternative keys:`, Object.keys(alternative));
          console.log(`[Speech-to-Text] Has words:`, !!alternative.words, `count:`, alternative.words?.length || 0);
          
          if (alternative.words && alternative.words.length > 0) {
            console.log(`[Speech-to-Text] Processing ${alternative.words.length} words...`);
            for (let j = 0; j < alternative.words.length; j++) {
              const word = alternative.words[j];
              
              // Log first few words for debugging
              if (j < 3) {
                console.log(`[Speech-to-Text] Word ${j + 1} structure:`, JSON.stringify(word, null, 2));
              }
              
              if (word.word && word.startTime && word.endTime) {
                // Convert from "Xs" or "X.XXXs" format to seconds
                const startSeconds = this.#parseTimeString(word.startTime);
                const endSeconds = this.#parseTimeString(word.endTime);
                
                words.push({
                  word: word.word.trim(),
                  startTime: startSeconds,
                  endTime: endSeconds,
                });
              } else {
                console.warn(`[Speech-to-Text] ⚠ Word ${j + 1} missing required fields:`, {
                  hasWord: !!word.word,
                  hasStartTime: !!word.startTime,
                  hasEndTime: !!word.endTime,
                  wordKeys: Object.keys(word),
                  wordData: word
                });
              }
            }
            console.log(`[Speech-to-Text] Extracted ${words.length} words from result ${i + 1}`);
          } else {
            console.error(`[Speech-to-Text] ❌ Alternative has no words array`);
            console.error(`[Speech-to-Text] Alternative structure:`, JSON.stringify(alternative, null, 2));
          }
        } else {
          console.error(`[Speech-to-Text] ❌ Result has no alternatives`);
          console.error(`[Speech-to-Text] Result structure:`, JSON.stringify(result, null, 2));
        }
      }

      if (words.length === 0) {
        console.error(`[Speech-to-Text] ❌❌❌ CRITICAL: No words extracted after processing all results`);
        console.error(`[Speech-to-Text] Full API response:`, JSON.stringify(data, null, 2));
        throw new Error("No word timestamps found in transcription results. Check that enableWordTimeOffsets is set to true and the API response contains word-level timing data.");
      }

      console.log(`[Speech-to-Text] ✓✓✓ SUCCESS: Extracted ${words.length} words with timestamps`);
      console.log(`[Speech-to-Text] Sample words:`, words.slice(0, 3).map(w => `${w.word} (${w.startTime.toFixed(2)}s-${w.endTime.toFixed(2)}s)`));
      
      // Log all words for verification
      const allWordsText = words.map(w => w.word).join(' ');
      console.log(`[Speech-to-Text] All transcribed words: "${allWordsText}"`);
      console.log(`[Speech-to-Text] Total word count: ${words.length}`);
      
      return words;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to transcribe audio: ${error.message || String(error)}`);
    }
  }

  /**
   * Parse time string from Google Speech-to-Text API format ("Xs" or "X.XXXs")
   * @private
   */
  #parseTimeString(timeStr) {
    if (!timeStr) return 0;
    // Remove "s" suffix and parse as float
    const seconds = parseFloat(timeStr.replace("s", ""));
    return isNaN(seconds) ? 0 : seconds;
  }

  /**
   * Normalize language code for Speech-to-Text API.
   * @private
   */
  #normalizeLanguageCode(language) {
    const langMap = {
      "en": "en-US",
      "es": "es-ES",
      "fr": "fr-FR",
      "hi": "hi-IN",
      "ja": "ja-JP",
      "sw": "sw-KE",
      "ar": "ar-SA",
      "zh": "zh-CN",
      "de": "de-DE",
      "pt": "pt-BR",
      "ru": "ru-RU",
    };
    
    // If already in format like "en-US", return as-is
    if (language.includes("-")) {
      return language;
    }
    
    // Map simple codes to full codes
    return langMap[language.toLowerCase()] || language;
  }
}

export default SpeechToText;

