/**
 * Murf Service - Text-to-Speech
 * Uses Murf.ai API for high-quality voice synthesis
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const MURF_API_KEY = process.env.MURF_API_KEY;

/**
 * Generate audio stream from text using Murf.ai
 * @param {string} text - The text to convert to speech
 * @param {Object} options - Additional options
 * @returns {Promise<Buffer>} - Binary audio data
 */
export async function generateAudioStream(text, options = {}) {
  try {
    console.log(`[Murf] 🔊 Generating audio for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    if (!MURF_API_KEY) {
      throw new Error('MURF_API_KEY not configured');
    }

    // Murf API v1 format - Indian English voice
    const payload = {
      voiceId: options.voiceId || 'en-IN-aarav',  // Indian English male (Aarav)
      style: options.style || 'Conversational',
      text: text,
      rate: options.rate || 0,
      pitch: options.pitch || 0,
      sampleRate: 24000,
      format: 'WAV',
      channelType: 'MONO'
    };

    console.log('[Murf] Request payload:', {
      voiceId: payload.voiceId,
      style: payload.style,
      textLength: text.length
    });

    // Make API request with api-key header
    const response = await axios.post('https://api.murf.ai/v1/speech/generate', payload, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': MURF_API_KEY,
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    // Check if response contains audioFile URL
    if (response.data && response.data.audioFile) {
      console.log('[Murf] Got audio URL, downloading...');

      const audioResponse = await axios.get(response.data.audioFile, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      console.log(`[Murf] ✓ Audio downloaded (${audioResponse.data.length} bytes)`);
      return Buffer.from(audioResponse.data);
    }

    throw new Error('No audio URL in response');

  } catch (error) {
    console.error('[Murf] ❌ Error:', error.message);

    if (error.response) {
      console.error('[Murf] API Error:', {
        status: error.response.status,
        data: JSON.stringify(error.response.data)
      });
    }

    throw error;
  }
}

/**
 * Generate audio from TOON response
 * @param {Object} toonResponse - Parsed TOON response
 * @returns {Promise<Buffer>} - Binary audio data
 */
export async function generateFromTOON(toonResponse) {
  if (!toonResponse || !toonResponse.text) {
    throw new Error('Invalid TOON response: missing text');
  }

  console.log('[Murf] Processing TOON:', toonResponse);

  // Map emotion to style
  const styleMap = {
    'happy': 'Excited',
    'sad': 'Sad',
    'angry': 'Angry',
    'neutral': 'Conversational'
  };

  let style = styleMap[toonResponse.emotion?.toLowerCase()] || 'Conversational';

  // Indian voices (en-IN-*) only support Conversational style
  // Use Conversational for all emotions with Indian voices
  const voiceId = 'en-IN-aarav'; // Current voice
  if (voiceId.startsWith('en-IN-')) {
    style = 'Conversational'; // Force Conversational for Indian voices
    console.log('[Murf] Using Conversational style for Indian voice');
  }

  return await generateAudioStream(toonResponse.text, { style });
}

export default { generateAudioStream, generateFromTOON };
