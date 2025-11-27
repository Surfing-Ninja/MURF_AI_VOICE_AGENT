/**
 * Deepgram Service - Speech-to-Text Streaming
 * Uses Deepgram Nova-2 for real-time audio transcription
 * Handles binary audio streams and returns final transcripts
 */

import { createClient } from '@deepgram/sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

/**
 * Creates a live Deepgram transcription stream
 * @param {WebSocket} clientWs - Client WebSocket connection to send transcripts back
 * @param {Function} onTranscript - Callback function when final transcript is received
 * @returns {Object} - Deepgram connection object
 */
export function createStream(clientWs, onTranscript) {
  try {
    console.log('[Deepgram] Initializing live transcription stream...');

    // Create live transcription connection with Nova-2 model
    // Let Deepgram auto-detect the audio format (WebM from MediaRecorder or Linear16 from legacy)
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true, // Get interim results for better UX
      endpointing: 300, // Milliseconds of silence before finalizing
      utterance_end_ms: 1000 // Milliseconds before ending utterance
      // NOTE: Removed encoding/sample_rate/channels to let Deepgram auto-detect
    });

    // Handle connection open
    connection.on('open', () => {
      console.log('[Deepgram] ✓ Connection established');
      
      // Notify client that STT is ready
      clientWs.send(JSON.stringify({
        type: 'stt_ready',
        message: 'Speech-to-text ready',
        timestamp: Date.now()
      }));

      // Keep-alive mechanism (Deepgram requires periodic data)
      const keepAlive = setInterval(() => {
        if (connection.getReadyState() === 1) {
          connection.keepAlive();
        } else {
          clearInterval(keepAlive);
        }
      }, 10000); // Send keep-alive every 10 seconds

      // Store interval ID for cleanup
      connection._keepAliveInterval = keepAlive;
    });

    // Handle incoming transcripts
    connection.on('Results', (data) => {
      const transcript = data.channel?.alternatives?.[0];
      
      if (!transcript) return;

      const text = transcript.transcript;
      const isFinal = data.is_final;
      const speechFinal = data.speech_final;

      // Log interim results for debugging
      if (text && !isFinal) {
        console.log(`[Deepgram] Interim: "${text}"`);
      }

      // Only process final transcripts
      if (isFinal && speechFinal && text.trim().length > 0) {
        console.log(`[Deepgram] 🎤 Final Transcript: "${text}"`);
        
        // Send transcript to client
        clientWs.send(JSON.stringify({
          type: 'transcript',
          text: text,
          isFinal: true,
          timestamp: Date.now()
        }));

        // Trigger callback for downstream processing (RAG + LLM)
        if (onTranscript && typeof onTranscript === 'function') {
          onTranscript(text);
        }
      }
    });

    // Handle metadata
    connection.on('Metadata', (data) => {
      console.log('[Deepgram] Metadata received:', data);
    });

    // Handle errors
    connection.on('error', (error) => {
      console.error('[Deepgram] ❌ Error:', error);
      clientWs.send(JSON.stringify({
        type: 'error',
        service: 'deepgram',
        message: error.message,
        timestamp: Date.now()
      }));
    });

    // Handle connection close
    connection.on('close', (code, reason) => {
      console.log(`[Deepgram] Connection closed. Code: ${code}, Reason: ${reason}`);
      
      // Clean up keep-alive interval
      if (connection._keepAliveInterval) {
        clearInterval(connection._keepAliveInterval);
      }
    });

    // Handle warnings
    connection.on('warning', (warning) => {
      console.warn('[Deepgram] ⚠️ Warning:', warning);
    });

    // Handle unhandled events
    connection.on('UtteranceEnd', (data) => {
      console.log('[Deepgram] Utterance ended');
    });

    return connection;

  } catch (error) {
    console.error('[Deepgram] Failed to create stream:', error);
    throw error;
  }
}

/**
 * Gracefully close a Deepgram connection
 * @param {Object} connection - Deepgram connection object
 */
export function closeStream(connection) {
  if (connection) {
    try {
      console.log('[Deepgram] Closing connection...');
      
      // Clear keep-alive interval
      if (connection._keepAliveInterval) {
        clearInterval(connection._keepAliveInterval);
      }
      
      // Finish the stream (tells Deepgram to finalize any pending audio)
      connection.finish();
      
      console.log('[Deepgram] ✓ Connection closed');
    } catch (error) {
      console.error('[Deepgram] Error closing connection:', error);
    }
  }
}

export default { createStream, closeStream };
