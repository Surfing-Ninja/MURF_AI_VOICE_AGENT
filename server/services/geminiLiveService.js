/**
 * Gemini Live Audio Service - WORKING TRANSCRIPT EXTRACTION
 * Based on Namaste Support implementation
 * Key: Check modelTurn.parts[0].text for transcripts!
 */

import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const SYSTEM_INSTRUCTION = `You are 'Samar', a friendly, professional customer support agent for 'DesiMart', an Indian e-commerce platform.

PERSONALITY:
- Warm, empathetic, and culturally attuned to Indian customers
- Speak fluent English with natural Hinglish phrases (Ji, acha, bilkul)
- Use Indian honorifics respectfully

RESPONSE STYLE:
- Keep responses SHORT (1-2 sentences max)
- Be conversational and natural
- Don't repeat greetings mid-conversation
- Use context when provided, otherwise politely clarify

CONTEXT USAGE:
- If context is relevant, use it naturally
- If context doesn't match the query, say "Let me check that for you"
- Don't hallucinate - stick to provided context or admit you need to verify

Remember: Currency is ₹ (Rupees), festivals are Diwali/Holi/Eid, be patient and respectful.`;

/**
 * Create Gemini Live session with transcript extraction
 */
export async function createLiveSession(ws, options = {}) {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        console.log('[Gemini Live] Creating session...');

        const liveConfig = {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Zephyr' }
                }
            },
            systemInstruction: {
                parts: [{ text: options.systemInstruction || SYSTEM_INSTRUCTION }]
            }
        };

        console.log('✅ CONFIG: AUDIO-only + transcription');

        const session = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: liveConfig,
            callbacks: {
                onopen: () => {
                    console.log('[Gemini Live] ✅ Session connected');
                    ws.send(JSON.stringify({
                        type: 'gemini_connected',
                        timestamp: Date.now()
                    }));
                },

                onmessage: async (msg) => {
                    const { serverContent } = msg;

                    // ===== EXTRACT MODEL TRANSCRIPT (NAMASTE SUPPORT METHOD) =====
                    // Check modelTurn.parts[0].text FIRST (this is where transcripts appear!)
                    if (serverContent?.modelTurn?.parts?.[0]?.text) {
                        const modelText = serverContent.modelTurn.parts[0].text;
                        console.log(`\n${'='.repeat(60)}`);
                        console.log(`[Gemini Live] 🤖 MODEL TRANSCRIPT FOUND:`);
                        console.log(`"${modelText}"`);
                        console.log(`${'='.repeat(60)}\n`);

                        ws.send(JSON.stringify({
                            type: 'gemini_text',
                            text: modelText,
                            timestamp: Date.now()
                        }));
                    }
                    // Fallback: check outputTranscription
                    else if (serverContent?.outputTranscription?.text) {
                        const modelText = serverContent.outputTranscription.text;
                        console.log(`[Gemini Live] 📝 Fallback transcript: "${modelText}"`);

                        ws.send(JSON.stringify({
                            type: 'gemini_text',
                            text: modelText,
                            timestamp: Date.now()
                        }));
                    }

                    // ===== EXTRACT USER TRANSCRIPTION =====
                    if (serverContent?.inputTranscription?.text) {
                        const userText = serverContent.inputTranscription.text;
                        console.log(`[Gemini Live] 👤 USER: "${userText}"`);

                        ws.send(JSON.stringify({
                            type: 'user_transcript',
                            text: userText,
                            timestamp: Date.now()
                        }));
                    }

                    // Check for audio (discard for Murf)
                    if (serverContent?.modelTurn?.parts) {
                        const audioPart = serverContent.modelTurn.parts.find(p => p.inlineData?.mimeType?.includes('audio'));
                        if (audioPart) {
                            console.log('[Gemini Live] 🔊 Audio detected (discarding for Murf)');
                        }
                    }

                    if (serverContent?.turnComplete) {
                        console.log('[Gemini Live] ✅ Turn complete\n');
                        ws.send(JSON.stringify({
                            type: 'gemini_turn_complete',
                            timestamp: Date.now()
                        }));
                    }

                    if (serverContent?.interrupted) {
                        console.log('[Gemini Live] 🔄 Interrupted');
                        ws.send(JSON.stringify({
                            type: 'gemini_interrupted',
                            timestamp: Date.now()
                        }));
                    }
                },

                onclose: (event) => {
                    console.log('[Gemini Live] 🔒 Session closed:', event.reason || 'Normal');
                    ws.send(JSON.stringify({
                        type: 'gemini_disconnected',
                        reason: event.reason,
                        timestamp: Date.now()
                    }));
                },

                onerror: (error) => {
                    console.error('[Gemini Live] ❌ Error:', error.message);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Gemini Live error',
                        error: error.message,
                        timestamp: Date.now()
                    }));
                }
            }
        });

        console.log('[Gemini Live] ✅ Session created successfully');
        return session;

    } catch (error) {
        console.error('[Gemini Live] ❌ Failed to create session:', error.message);
        ws.send(JSON.stringify({
            type: 'error',
            message: 'Failed to connect to Gemini',
            error: error.message,
            timestamp: Date.now()
        }));
        throw error;
    }
}

export async function sendAudio(session, base64Audio) {
    try {
        session.sendRealtimeInput({
            media: {
                mimeType: 'audio/pcm;rate=16000',
                data: base64Audio
            }
        });
        console.log('[Gemini Live] 🎤 Audio sent');
    } catch (error) {
        console.error('[Gemini Live] ❌ Audio send error:', error.message);
        throw error;
    }
}

export async function injectContext(session, contextText) {
    try {
        session.sendClientContent({
            turns: [
                {
                    role: 'user',
                    parts: [{ text: `[CONTEXT FOR NEXT QUERY]: ${contextText}` }]
                }
            ],
            turnComplete: false
        });
        console.log(`[Gemini Live] 📚 Context injected (${contextText.length} chars)`);
    } catch (error) {
        console.error('[Gemini Live] ❌ Context inject error:', error.message);
        throw error;
    }
}

export async function sendText(session, text) {
    try {
        session.sendClientContent({
            turns: text,
            turnComplete: true
        });
        console.log(`[Gemini Live] 💬 Text sent: "${text.substring(0, 50)}..."`);
    } catch (error) {
        console.error('[Gemini Live] ❌ Text send error:', error.message);
        throw error;
    }
}

export async function endAudioStream(session) {
    try {
        session.sendRealtimeInput({
            audioStreamEnd: true
        });
        console.log('[Gemini Live] 🔚 Audio stream ended');
    } catch (error) {
        console.error('[Gemini Live] ❌ End stream error:', error.message);
        throw error;
    }
}

export function closeSession(session) {
    try {
        session.close();
        console.log('[Gemini Live] 🔒 Session closed by client');
    } catch (error) {
        console.error('[Gemini Live] ❌ Close error:', error.message);
    }
}

export default {
    createLiveSession,
    sendAudio,
    injectContext,
    sendText,
    endAudioStream,
    closeSession
};