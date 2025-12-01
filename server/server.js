/**
 * VOICE AGENT SERVER - THE ORCHESTRATOR
 * 
 * This is the main server that coordinates all services:
 * - Deepgram: Speech-to-Text (Nova-2)
 * - Gemini: AI Brain (2.0 Flash-Lite) with TOON format
 * - RAG: Memory/Context (Pinecone + Embeddings)
 * - Murf: Text-to-Speech (Falcon)
 * 
 * Data Flow:
 * 1. Client streams binary audio → Deepgram STT
 * 2. Deepgram transcript → RAG query for context
 * 3. Transcript + Context → Gemini for intelligent response
 * 4. Gemini TOON response → Murf TTS
 * 5. Murf audio → Stream back to client
 * 
 * Additional Features:
 * - "Look Over My Shoulder": Accept base64 images for multimodal analysis
 * - Session Context: Store screen captures and conversation history per client
 * - Agentic Tools: Execute actions via Gemini tool calls
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@deepgram/sdk';

// Import services
import { createStream, closeStream } from './services/deepgramService.js';
import { generateResponse as generateGeminiResponse } from './services/geminiService.js';
import { queryContext } from './services/ragService.js';
import { generateFromTOON } from './services/murfService.js';

// Import AI Controller
import { generateResponse } from './aiController.js';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Session storage for client context
const sessions = new Map();

// Middleware
app.use(express.json({ limit: '50mb' })); // Large limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// CORS headers for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      deepgram: !!process.env.DEEPGRAM_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      murf: !!process.env.MURF_API_KEY,
      pinecone: !!process.env.PINECONE_API_KEY
    }
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

/**
 * Initialize client session
 */
function initializeSession(clientId) {
  return {
    clientId,
    deepgramConnection: null,
    audioBuffer: [],
    lastTranscript: '',
    lastTranscriptTime: 0,  // Track when last transcript was received
    pendingResponse: false,  // Track if we're currently processing a response
    bargeInWindow: 2000,      // 2 second window to detect barge-ins
    screenCapture: null, // Store latest screen capture
    conversationHistory: [],
    connectedAt: new Date(),
    isProcessing: false
  };
}

/**
 * Process complete voice interaction pipeline
 * Transcript → RAG → Gemini → Murf → Audio Stream
 */
async function processVoiceInteraction(clientId, transcript, ws) {
  const session = sessions.get(clientId);

  if (!session) {
    console.error(`[${clientId}] Session not found`);
    return;
  }

  // Prevent concurrent processing
  if (session.isProcessing) {
    console.log(`[${clientId}] Already processing, skipping...`);
    return;
  }

  session.isProcessing = true;

  try {
    console.log(`[${clientId}] ═══════════════════════════════════════`);
    console.log(`[${clientId}] 🎙️  USER: "${transcript}"`);

    // Step 1: Query RAG for relevant context
    ws.send(JSON.stringify({
      type: 'status',
      message: 'Searching knowledge base...',
      timestamp: Date.now()
    }));

    const ragContext = await queryContext(transcript);
    console.log(`[${clientId}] 📚 RAG Context: ${ragContext ? ragContext.length + ' chars' : 'none'}`);

    // Step 2: Generate AI response with Gemini (including multimodal if screen capture exists)
    ws.send(JSON.stringify({
      type: 'status',
      message: 'Thinking...',
      timestamp: Date.now()
    }));

    const geminiResponse = await generateResponse(
      transcript,
      ragContext,
      session.screenCapture // Include screen capture if available
    );

    console.log(`[${clientId}] 🧠 GEMINI: "${geminiResponse.text}"`);
    console.log(`[${clientId}]    Emotion: ${geminiResponse.emotion || 'neutral'}`);
    if (geminiResponse.tool) {
      console.log(`[${clientId}]    Tool: ${geminiResponse.tool}`);
    }
    if (geminiResponse.toolResult) {
      console.log(`[${clientId}]    Tool Result:`, geminiResponse.toolResult);
    }

    // Send transcript to client
    ws.send(JSON.stringify({
      type: 'ai_response',
      text: geminiResponse.text,
      emotion: geminiResponse.emotion,
      tool: geminiResponse.tool,
      toolResult: geminiResponse.toolResult,
      timestamp: Date.now()
    }));

    // Step 3: Generate audio with Murf
    ws.send(JSON.stringify({
      type: 'status',
      message: 'Generating voice...',
      timestamp: Date.now()
    }));

    const audioBuffer = await generateFromTOON(geminiResponse);
    console.log(`[${clientId}] 🔊 MURF: Generated ${audioBuffer.length} bytes of audio`);

    // Step 4: Stream audio back to client
    ws.send(JSON.stringify({
      type: 'audio_start',
      size: audioBuffer.length,
      timestamp: Date.now()
    }));

    // Send audio as binary
    ws.send(audioBuffer);

    ws.send(JSON.stringify({
      type: 'audio_complete',
      timestamp: Date.now()
    }));

    // Store in conversation history
    session.conversationHistory.push({
      user: transcript,
      assistant: geminiResponse.text,
      timestamp: new Date()
    });

    // Clear screen capture after use (for privacy)
    session.screenCapture = null;

    console.log(`[${clientId}] ✅ Interaction complete`);
    console.log(`[${clientId}] ═══════════════════════════════════════`);

  } catch (error) {
    console.error(`[${clientId}] ❌ Error in voice pipeline:`, error);

    ws.send(JSON.stringify({
      type: 'error',
      message: 'Sorry, I encountered an error processing your request.',
      error: error.message,
      timestamp: Date.now()
    }));
  } finally {
    session.isProcessing = false;
  }
}

/**
 * WebSocket connection handler
 */
wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`[${clientId}] 🔌 Client connected from ${req.socket.remoteAddress}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Initialize session
  const session = initializeSession(clientId);
  sessions.set(clientId, session);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to Voice Agent Server',
    clientId: clientId,
    capabilities: {
      stt: 'Deepgram Nova-2',
      llm: 'Gemini 2.0 Flash-Lite',
      tts: 'Murf Falcon',
      rag: 'Pinecone + Gemini Embeddings',
      multimodal: true
    },
    timestamp: Date.now()
  }));

  // Send initial greeting with TTS
  setTimeout(async () => {
    try {
      const greetingText = "Namaste! Welcome to DesiMart support. I am Samar. How can I help you today?";
      const greetingResponse = {
        text: greetingText,
        emotion: 'happy'
      };

      // Send greeting as AI response
      ws.send(JSON.stringify({
        type: 'ai_response',
        text: greetingResponse.text,
        emotion: greetingResponse.emotion,
        isGreeting: true,
        timestamp: Date.now()
      }));

      // Generate TTS for greeting
      console.log(`[${clientId}] 🎤 Generating greeting TTS...`);
      const audioBuffer = await generateFromTOON(greetingResponse);

      // Send TTS audio
      ws.send(JSON.stringify({
        type: 'tts_start',
        timestamp: Date.now()
      }));

      ws.send(JSON.stringify({
        type: 'tts_audio',
        audio: audioBuffer.toString('base64'),
        format: 'mp3',
        timestamp: Date.now()
      }));

      ws.send(JSON.stringify({
        type: 'tts_end',
        timestamp: Date.now()
      }));

      console.log(`[${clientId}] ✓ Initial greeting sent with audio`);
    } catch (error) {
      console.error(`[${clientId}] ⚠️ Error sending greeting:`, error.message);
      // Non-fatal - connection still works
    }
  }, 1000); // 1 second delay to ensure client is ready

  /**
   * Handle incoming messages (Binary Audio OR JSON Control)
   */
  ws.on('message', async (data, isBinary) => {
    try {
      // ═══════ BINARY AUDIO STREAM ═══════
      if (isBinary) {
        // Initialize Deepgram connection if not exists
        if (!session.deepgramConnection) {
          console.log(`[${clientId}] Creating Deepgram live connection...`);

          // Simple config - let Deepgram auto-detect everything
          session.deepgramConnection = deepgram.listen.live({
            model: 'nova-2',
            smart_format: true,
            interim_results: true,
            language: 'en-US',
            endpointing: 800  // Wait 800ms of silence (gentle, prevents cut-offs)
          });

          // Handle connection open
          session.deepgramConnection.on('open', () => {
            console.log(`[${clientId}] ✓ Deepgram connection established`);

            // Reset warning flag
            session.deepgramClosedWarningShown = false;

            // Send any buffered audio with small delays
            if (session.audioBuffer && session.audioBuffer.length > 0) {
              console.log(`[${clientId}] 📤 Sending ${session.audioBuffer.length} buffered audio chunks`);

              session.audioBuffer.forEach((chunk, index) => {
                setTimeout(() => {
                  if (session.deepgramConnection && session.deepgramConnection.getReadyState() === 1) {
                    session.deepgramConnection.send(chunk);
                  }
                }, index * 10);
              });
              session.audioBuffer = [];
            }

            // Set up keepalive
            session.deepgramKeepalive = setInterval(() => {
              if (session.deepgramConnection && session.deepgramConnection.getReadyState() === 1) {
                session.deepgramConnection.keepAlive();
              }
            }, 5000);
          });

          // Handle metadata
          session.deepgramConnection.on('Metadata', (metadata) => {
            console.log(`[${clientId}] 📊 Deepgram metadata:`, metadata);
          });

          // Handle warnings
          session.deepgramConnection.on('Warning', (warning) => {
            console.warn(`[${clientId}] ⚠️ Deepgram warning:`, warning);
          });

          // Handle incoming transcripts (Deepgram SDK v3 uses 'Results' event)
          session.deepgramConnection.on('Results', async (data) => {
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            const isFinal = data.is_final;
            const speechFinal = data.speech_final;

            // Only process if transcript exists, is not empty, AND speech is final
            if (isFinal && speechFinal) {
              const transcript = data.channel.alternatives[0].transcript;

              if (transcript && transcript.trim().length > 0) {
                console.log(`[${clientId}] 🎤 Deepgram Transcript (speech_final): "${transcript}"`);

                // BARGE-IN DETECTION: Check if user is continuing to speak
                const now = Date.now();
                const timeSinceLastTranscript = now - session.lastTranscriptTime;

                // If previous response is pending AND new transcript within barge-in window
                if (session.pendingResponse && timeSinceLastTranscript < session.bargeInWindow) {
                  console.log(`[${clientId}] 🔄 Barge-in detected! User continued speaking. Skipping previous partial query.`);
                  // Cancel pending response flag - we'll process the latest complete query instead
                  session.pendingResponse = false;
                  // Update transcript and timestamp
                  session.lastTranscript = transcript;
                  session.lastTranscriptTime = now;
                  // Don't process this yet - wait for the complete query
                  return;
                }

                // Update session tracking
                session.lastTranscript = transcript;
                session.lastTranscriptTime = now;
                session.pendingResponse = true;

                // Small delay to allow for potential barge-in
                setTimeout(async () => {
                  // Check if we're still the latest query (no barge-in occurred)
                  if (session.lastTranscript === transcript && session.pendingResponse) {
                    console.log(`[${clientId}] 🧠 Calling AI Controller...`);

                    try {
                      // Send transcript to client
                      ws.send(JSON.stringify({
                        type: 'transcript',
                        text: transcript,
                        isFinal: true,
                        timestamp: Date.now()
                      }));

                      const aiResponse = await generateResponse(transcript, session.conversationHistory);

                      console.log(`[${clientId}] ✓ AI Response - Text: "${aiResponse.text}"`);
                      console.log(`[${clientId}] ✓ AI Response - Emotion: ${aiResponse.emotion}`);

                      // Send response to client
                      ws.send(JSON.stringify({
                        type: 'ai_response',
                        text: aiResponse.text,
                        emotion: aiResponse.emotion,
                        timestamp: Date.now()
                      }));

                      // Store in conversation history
                      session.conversationHistory.push({
                        user: transcript,
                        assistant: aiResponse.text,
                        timestamp: new Date()
                      });

                      // Generate TTS audio
                      console.log(`[${clientId}] 🔊 Generating TTS audio...`);
                      const audioBuffer = await generateFromTOON(aiResponse);

                      // Send TTS audio
                      ws.send(JSON.stringify({
                        type: 'tts_start',
                        timestamp: Date.now()
                      }));

                      ws.send(JSON.stringify({
                        type: 'tts_audio',
                        audio: audioBuffer.toString('base64'),
                        format: 'mp3',
                        timestamp: Date.now()
                      }));

                      ws.send(JSON.stringify({
                        type: 'tts_end',
                        timestamp: Date.now()
                      }));

                      console.log(`[${clientId}] ✓ TTS audio sent (${audioBuffer.length} bytes)`);

                    } catch (error) {
                      console.error(`[${clientId}] ❌ Error in AI pipeline:`, error.message);

                      ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Failed to generate response',
                        timestamp: Date.now()
                      }));
                    } finally {
                      session.pendingResponse = false;
                    }
                  } else {
                    console.log(`[${clientId}] ⏭️ Skipping outdated query - newer input received`);
                  }
                }, 300); // 300ms delay to detect rapid follow-up speech
              }
            } else if (transcript && transcript.trim().length > 0) {
              // Log interim results but don't process
              console.log(`[${clientId}] 🎤 Interim: "${transcript}"`);
            }
          });

          // Handle errors
          session.deepgramConnection.on('error', (error) => {
            console.error(`[${clientId}] ❌ Deepgram error:`, error);
            console.error(`[${clientId}] Error details:`, JSON.stringify(error, null, 2));
            ws.send(JSON.stringify({
              type: 'error',
              service: 'deepgram',
              message: error.message || 'Deepgram connection error',
              timestamp: Date.now()
            }));
          });

          // Handle connection close
          session.deepgramConnection.on('close', (closeEvent) => {
            console.log(`[${clientId}] Deepgram connection closed. Code: ${closeEvent?.code}, Reason: ${closeEvent?.reason || 'No reason'}`);

            // Clear keepalive
            if (session.deepgramKeepalive) {
              clearInterval(session.deepgramKeepalive);
              session.deepgramKeepalive = null;
            }
          });
        }

        // Send audio chunk to Deepgram
        if (session.deepgramConnection) {
          const readyState = session.deepgramConnection.getReadyState();

          if (readyState === 1) {
            // Connection is OPEN - send audio directly
            session.deepgramConnection.send(data);
          } else if (readyState === 0) {
            // Connection is CONNECTING - buffer audio
            if (!session.audioBuffer) {
              session.audioBuffer = [];
            }
            session.audioBuffer.push(data);
          } else {
            // Connection is CLOSING or CLOSED - discard audio
            // Don't spam logs - this is normal when connection closes
            if (!session.deepgramClosedWarningShown) {
              console.warn(`[${clientId}] ⚠️ Deepgram socket is closed. Discarding audio chunks.`);
              session.deepgramClosedWarningShown = true;
            }
          }
        }
      }
      // ═══════ JSON CONTROL MESSAGES ═══════
      else {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          // Start recording - initialize Deepgram stream
          case 'start_recording':
            console.log(`[${clientId}] 🎤 Recording started`);

            // Note: The Deepgram connection is usually already created by the binary audio handler
            if (!session.deepgramConnection) {
              console.log(`[${clientId}] Creating Deepgram live connection (from start_recording)...`);

              // Simple config - let Deepgram auto-detect
              session.deepgramConnection = deepgram.listen.live({
                model: 'nova-2',
                smart_format: true,
                interim_results: true,
                language: 'en-US',
                endpointing: 800  // Wait 800ms of silence (gentle, prevents cut-offs)
              });

              // Handle connection open
              session.deepgramConnection.on('open', () => {
                console.log(`[${clientId}] ✓ Deepgram connection established`);

                // Reset warning flag
                session.deepgramClosedWarningShown = false;

                // Send any buffered audio with small delays
                if (session.audioBuffer && session.audioBuffer.length > 0) {
                  console.log(`[${clientId}] 📤 Sending ${session.audioBuffer.length} buffered audio chunks`);

                  session.audioBuffer.forEach((chunk, index) => {
                    setTimeout(() => {
                      if (session.deepgramConnection && session.deepgramConnection.getReadyState() === 1) {
                        session.deepgramConnection.send(chunk);
                      }
                    }, index * 10);
                  });
                  session.audioBuffer = [];
                }

                // Set up keepalive using Deepgram's proper keepAlive() method
                session.deepgramKeepalive = setInterval(() => {
                  if (session.deepgramConnection && session.deepgramConnection.getReadyState() === 1) {
                    session.deepgramConnection.keepAlive();
                  }
                }, 5000);

                ws.send(JSON.stringify({
                  type: 'stt_ready',
                  message: 'Speech-to-text ready',
                  timestamp: Date.now()
                }));
              });

              // Handle metadata
              session.deepgramConnection.on('Metadata', (metadata) => {
                console.log(`[${clientId}] 📊 Deepgram metadata:`, metadata);
              });

              // Handle warnings
              session.deepgramConnection.on('Warning', (warning) => {
                console.warn(`[${clientId}] ⚠️ Deepgram warning:`, warning);
              });

              // Handle incoming transcripts (Deepgram SDK v3 uses 'Results' event)
              session.deepgramConnection.on('Results', async (data) => {
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                const isFinal = data.is_final;
                const speechFinal = data.speech_final;

                // Only process if transcript exists, is not empty, AND speech is final
                if (transcript && transcript.trim().length > 0 && speechFinal) {
                  console.log(`[${clientId}] 🎤 Deepgram Transcript (speech_final): "${transcript}"`);

                  // Send transcript to client
                  ws.send(JSON.stringify({
                    type: 'transcript',
                    text: transcript,
                    isFinal: true,
                    timestamp: Date.now()
                  }));

                  // Generate AI response using AI Controller
                  try {
                    console.log(`[${clientId}] 🧠 Calling AI Controller...`);
                    const aiResponse = await generateResponse(transcript, session.conversationHistory);

                    console.log(`[${clientId}] ✓ AI Response - Text: "${aiResponse.text}"`);
                    console.log(`[${clientId}] ✓ AI Response - Emotion: ${aiResponse.emotion}`);

                    // Send AI response to client
                    ws.send(JSON.stringify({
                      type: 'ai_response',
                      text: aiResponse.text,
                      emotion: aiResponse.emotion,
                      timestamp: Date.now()
                    }));

                    // Store in conversation history
                    session.conversationHistory.push({
                      user: transcript,
                      assistant: aiResponse.text,
                      timestamp: new Date()
                    });

                    // Generate TTS audio using Murf
                    try {
                      console.log(`[${clientId}] 🔊 Generating TTS audio...`);
                      const audioBuffer = await generateFromTOON(aiResponse);

                      // Send audio as binary blob
                      ws.send(JSON.stringify({
                        type: 'tts_start',
                        timestamp: Date.now()
                      }));

                      // Send audio data as base64 (since we're using JSON protocol)
                      ws.send(JSON.stringify({
                        type: 'tts_audio',
                        audio: audioBuffer.toString('base64'),
                        format: 'mp3',
                        timestamp: Date.now()
                      }));

                      ws.send(JSON.stringify({
                        type: 'tts_end',
                        timestamp: Date.now()
                      }));

                      console.log(`[${clientId}] ✓ TTS audio sent (${audioBuffer.length} bytes)`);
                    } catch (ttsError) {
                      console.error(`[${clientId}] ⚠️ TTS error (continuing without audio):`, ttsError.message);
                      // Non-fatal: user still gets text response
                    }

                  } catch (error) {
                    console.error(`[${clientId}] ❌ AI Controller error:`, error);
                    ws.send(JSON.stringify({
                      type: 'error',
                      message: 'Failed to generate AI response',
                      timestamp: Date.now()
                    }));
                  }
                } else if (transcript && transcript.trim().length > 0) {
                  // Log interim results but don't process
                  console.log(`[${clientId}] 🎤 Interim: "${transcript}"`);
                }
              });

              // Handle errors
              session.deepgramConnection.on('error', (error) => {
                console.error(`[${clientId}] ❌ Deepgram error:`, error);
                console.error(`[${clientId}] Error details:`, JSON.stringify(error, null, 2));
                ws.send(JSON.stringify({
                  type: 'error',
                  service: 'deepgram',
                  message: error.message || 'Deepgram connection error',
                  timestamp: Date.now()
                }));
              });

              // Handle connection close
              session.deepgramConnection.on('close', (closeEvent) => {
                console.log(`[${clientId}] Deepgram connection closed. Code: ${closeEvent?.code}, Reason: ${closeEvent?.reason || 'No reason'}`);

                // Clear keepalive
                if (session.deepgramKeepalive) {
                  clearInterval(session.deepgramKeepalive);
                  session.deepgramKeepalive = null;
                }
              });
            }

            ws.send(JSON.stringify({
              type: 'recording_started',
              timestamp: Date.now()
            }));
            break;

          // Stop recording - keep connection open for next interaction
          case 'stop_recording':
            console.log(`[${clientId}] ⏸️  Recording stopped`);

            ws.send(JSON.stringify({
              type: 'recording_stopped',
              timestamp: Date.now()
            }));
            break;

          // Screen capture from "Look Over My Shoulder"
          case 'screen_capture':
            console.log(`[${clientId}] 📸 Screen capture received (${message.image?.length || 0} bytes)`);

            // Store screen capture in session (base64 without prefix)
            if (message.image) {
              // Remove data:image/png;base64, prefix if present
              session.screenCapture = message.image.replace(/^data:image\/\w+;base64,/, '');

              ws.send(JSON.stringify({
                type: 'screen_capture_received',
                message: 'Screen capture stored. I can see your screen now.',
                timestamp: Date.now()
              }));
            }
            break;

          // Text input (alternative to voice)
          case 'text_input':
            console.log(`[${clientId}] 💬 Text input: "${message.text}"`);
            await processVoiceInteraction(clientId, message.text, ws);
            break;

          // Ping/pong for connection health
          case 'ping':
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }));
            break;

          default:
            console.warn(`[${clientId}] ⚠️  Unknown message type: ${message.type}`);
            ws.send(JSON.stringify({
              type: 'error',
              message: `Unknown message type: ${message.type}`,
              timestamp: Date.now()
            }));
        }
      }
    } catch (error) {
      console.error(`[${clientId}] ❌ Error processing message:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message,
        timestamp: Date.now()
      }));
    }
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error(`[${clientId}] ❌ WebSocket error:`, error);
  });

  // Handle client disconnection
  ws.on('close', (code, reason) => {
    console.log(`[${clientId}] 👋 Client disconnected. Code: ${code}`);

    // Clean up Deepgram connection
    const session = sessions.get(clientId);
    if (session?.deepgramConnection) {
      try {
        session.deepgramConnection.finish();
        console.log(`[${clientId}] Deepgram connection closed`);
      } catch (error) {
        console.error(`[${clientId}] Error closing Deepgram:`, error);
      }
    }

    // Remove session
    sessions.delete(clientId);

    console.log(`[${clientId}] Session cleaned up`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🚀 VOICE AGENT SERVER - DAY 1 MVP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log(`  📡 HTTP Server:       http://localhost:${PORT}`);
  console.log(`  🔌 WebSocket Server:  ws://localhost:${PORT}`);
  console.log(`  💚 Health Check:      http://localhost:${PORT}/health`);
  console.log(`  🌐 Frontend:          http://localhost:${PORT}`);
  console.log();
  console.log('  🎙️  STT: Deepgram Nova-2');
  console.log('  🧠 LLM: Gemini 2.0 Flash-Lite (TOON Format)');
  console.log('  🔊 TTS: Murf Falcon');
  console.log('  📚 RAG: Pinecone + Gemini Embeddings');
  console.log('  👁️  Vision: Multimodal Screen Analysis');
  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  console.log('\n⏳ Shutting down gracefully...');

  // Close all Deepgram connections
  sessions.forEach((session, clientId) => {
    if (session.deepgramConnection) {
      console.log(`  Closing Deepgram for client ${clientId}`);
      try {
        session.deepgramConnection.finish();
      } catch (error) {
        console.error(`  Error closing Deepgram for ${clientId}:`, error);
      }
    }
  });

  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}
