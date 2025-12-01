

const MURF_API_KEY = 'ap2_dc79b9ad-09ea-42a8-a030-e07bded1b1c3';

export async function generateMurfSpeech(text: string): Promise<ArrayBuffer> {
  if (!text || !text.trim()) {
    throw new Error('Text is empty');
  }

  console.log(`[Murf Service] Generating speech for text length: ${text.length}`);

  try {
    const response = await fetch('https://api.murf.ai/v1/speech/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': MURF_API_KEY
      },
      body: JSON.stringify({
        voiceId: 'en-US-natalie',
        text: text,
        rate: 20,
        pitch: 0,
        sampleRate: 24000, // Optimized: 24kHz is standard for high-quality speech and faster than 44.1kHz
        format: 'MP3',
        channelType: 'MONO',
        encodeAsBase64: true
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

    const data = await response.json();
    console.log('[Murf Service] Received response from API');
    
    if (data.encodedAudio) {
      const binaryString = atob(data.encodedAudio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      console.log(`[Murf Service] Decoded audio buffer size: ${bytes.buffer.byteLength} bytes`);
      return bytes.buffer;
    }
    
    if (data.audioFile) {
        console.log('[Murf Service] Fetching audio file from URL:', data.audioFile);
        const audioRes = await fetch(data.audioFile);
        if (!audioRes.ok) throw new Error('Failed to fetch audio file from URL');
        return await audioRes.arrayBuffer();
    }

    throw new Error('Invalid response from Murf API: No audio data found');
  } catch (err) {
    console.error("[Murf Service] Exception:", err);
    throw err;
  }
}