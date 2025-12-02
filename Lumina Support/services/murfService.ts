

const MURF_API_KEY = import.meta.env.VITE_MURF_API_KEY;

export async function generateMurfSpeech(text: string): Promise<ArrayBuffer> {
  if (!text || !text.trim()) {
    throw new Error('Text is empty');
  }

  console.log(`[Murf Service] Generating speech for text length: ${text.length}`);

  try {
    const response = await fetch('https://global.api.murf.ai/v1/speech/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': MURF_API_KEY
      },
      body: JSON.stringify({
        voiceId: 'en-US-matthew',
        text: text,
        multiNativeLocale: 'en-US',
        model: 'FALCON',
        format: 'MP3',
        sampleRate: 24000,
        channelType: 'MONO'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Murf Service] API Error: ${response.status}`, errorText);
      if (response.status === 401) {
        throw new Error('Murf API Unauthorized (401). Check API Key.');
      }
      throw new Error(`Murf API failed: ${response.status} - ${errorText}`);
    }

    console.log('[Murf Service] Received response from API');

    // The stream endpoint returns binary audio directly
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > 0) {
      console.log(`[Murf Service] Received audio buffer size: ${arrayBuffer.byteLength} bytes`);
      return arrayBuffer;
    }

    throw new Error('Invalid response from Murf API: No audio data found');
  } catch (err) {
    console.error("[Murf Service] Exception:", err);
    throw err;
  }
}