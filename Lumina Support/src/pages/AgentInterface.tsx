
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ChatMessage, ConnectionState } from '../../types';
import { createBlob } from '../../services/audioUtils';
import { generateMurfSpeech } from '../../services/murfService';
import { Header } from '../../components/Header';
import { ChatMessageBubble } from '../../components/ChatMessageBubble';

// --- Configuration ---
const SYSTEM_INSTRUCTION = `You are a friendly and knowledgeable customer support agent for "Lumina" (formerly DesiMart), a premium online lifestyle store. 
Your tone is professional, warm, and concise. 
CRITICAL: Keep your responses extremely short (1-2 sentences max) to ensure fast real-time conversation.
CRITICAL: Output text only. Do not use Markdown (no bold, italics, or lists).
Assist with order tracking, product recommendations, and returns using the following knowledge base:

=== CURRENT OFFERS ===
🎉 DIWALI DHAMAKA SALE (Oct 15 - Nov 15): Up to 70% off Electronics. Extra 10% off with HDFC/ICICI/SBI.
- iPhone 15 Pro: ₹1,19,900 (Save ₹15k)
- S24 Ultra: ₹1,14,999 (Save ₹15k)
- MacBook Air M3: ₹99,900
- Sony WH-1000XM5: ₹19,990
Coupons: DIWALI2024 (Extra ₹500 >₹10k), FIRSTDIWALI (Flat ₹2000 off first order >₹25k).

=== POLICIES ===
- Returns: 30-day money-back guarantee on most items. 7-10 day refund.
- Shipping: Free >₹499. Metro: 1-3 days. Tier 2: 3-5 days.
- Warranty: Manufacturer warranty + optional extended plans.
- Support: 1800-123-4567 (9AM-9PM).

=== PRODUCT CATALOG HIGHLIGHTS ===
- iPhone 15 Pro (128GB): ₹1,34,900. Titanium.
- Samsung S24 Ultra: ₹1,29,999. 200MP Cam.
- MacBook Air M3: ₹1,14,900. 13.6" Retina.
- Sony WH-1000XM5: ₹29,990. Best ANC.
- PS5: ₹54,990. 4K 120Hz.

=== FAQs & PROCEDURES ===
- Tracking: "My Orders" > "Track Order". Or reply "TRACK" to SMS.
- Cancel: "My Orders" > "Cancel" (before ship). After ship: Refuse delivery.
- Wrong Product: Contact support immediately. Free pickup & replacement.
- Payment: Cards, UPI, NetBanking, COD (<₹50k).
- Refund: 7-10 days to bank. Instant to Wallet.

Use this info to answer questions accurately. If asked about something not here, politely say you don't have that info.

CRITICAL INSTRUCTION: You have access to tools 'search_order', 'place_order', 'cancel_order', and 'check_stock'.
- If a user wants to place an order, you MUST call the 'place_order' tool. Do NOT just say you placed it.
- If a user asks about an order status, you MUST call the 'search_order' tool.
- If a user wants to cancel, you MUST call 'cancel_order'.
- If a user asks for price or stock, call 'check_stock'.
- NEVER hallucinate or pretend to perform these actions without calling the tool.`;

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

interface AudioQueueItem {
  id: string;
  audioPromise: Promise<HTMLAudioElement | null>;
}

// --- AudioWorklet Processor Code ---
// This runs on a separate thread for low-latency processing, similar to WebRTC internals.
const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 512; // ~32ms at 16kHz
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.index++] = channel[i];
      if (this.index >= this.bufferSize) {
        this.port.postMessage(this.buffer);
        this.index = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

// --- Tool Definitions ---
// --- Tool Definitions ---
const tools = [
  {
    functionDeclarations: [
      {
        name: "search_order",
        description: "Search for an order by its ID to get status and details.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            order_id: { type: "STRING" as any, description: "The order ID (e.g., ORD-12345)" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "place_order",
        description: "Place a new order for a product.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            item_name: { type: "STRING" as any, description: "Name of the item to order" },
            quantity: { type: "INTEGER" as any, description: "Quantity of the item" },
            address: { type: "STRING" as any, description: "Delivery address" },
            customer_name: { type: "STRING" as any, description: "Name of the customer" }
          },
          required: ["item_name", "quantity", "address"]
        }
      },
      {
        name: "cancel_order",
        description: "Cancel an existing order by ID.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            order_id: { type: "STRING" as any, description: "The order ID to cancel" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "check_stock",
        description: "Check stock and price of a product.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            product_name: { type: "STRING" as any, description: "Name of the product" }
          },
          required: ["product_name"]
        }
      }
    ]
  }
];

const AgentInterface: React.FC = () => {
  // --- State ---
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // --- Refs for Audio & API ---
  const connectionStateRef = useRef<ConnectionState>(ConnectionState.DISCONNECTED);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const inputWorkletNodeRef = useRef<AudioWorkletNode | null>(null); // Replaces ScriptProcessor
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Ref to hold the currently playing HTML5 Audio object
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Refs for Queueing & Latency Reduction ---
  const ttsBufferRef = useRef<string>(''); // Accumulates text until a sentence is found
  const audioQueueRef = useRef<AudioQueueItem[]>([]); // Queue of pending audio clips
  const isPlayingRef = useRef<boolean>(false); // Mutex for playback loop

  // Transcription buffers for UI
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');

  // UI Scroll Ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to update both state and ref
  const updateConnectionState = (state: ConnectionState) => {
    setConnectionState(state);
    connectionStateRef.current = state;
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSynthesizing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMessage = useCallback((role: 'user' | 'model' | 'system', text: string, isFinal: boolean) => {
    setMessages((prev) => {
      let existingIndex = -1;
      // Search backwards to find the most recent non-final message for this role
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === role && !prev[i].isFinal) {
          existingIndex = i;
          break;
        }
      }

      if (existingIndex !== -1) {
        const newMessages = [...prev];
        newMessages[existingIndex] = {
          ...newMessages[existingIndex],
          text,
          isFinal
        };
        return newMessages;
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          role,
          text,
          isFinal,
          timestamp: new Date()
        }
      ];
    });
  }, []);

  const handleTestAudio = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4
      gainNode.gain.value = 0.1;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, 500);
    } catch (e) {
      console.error("Test audio failed", e);
      setError("Could not play test audio. Please check your system settings.");
    }
  }, []);

  // --- Playback Queue Logic ---

  const processAudioQueue = async () => {
    if (isPlayingRef.current) return; // Already running
    if (audioQueueRef.current.length === 0) {
      setIsSynthesizing(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSynthesizing(true);

    try {
      while (audioQueueRef.current.length > 0) {
        // Check connection before playing next chunk
        if (connectionStateRef.current !== ConnectionState.CONNECTED) {
          break;
        }

        const item = audioQueueRef.current[0]; // Peek
        const audio = await item.audioPromise;

        // INTERRUPTION CHECK:
        // If the queue was cleared (by user interruption) while we were awaiting the audio generation,
        // we must abort immediately. `audioQueueRef.current` would be [] if cleared.
        if (audioQueueRef.current.length === 0) {
          break;
        }

        // Remove from queue after resolving (so we don't block if resolve fails)
        audioQueueRef.current.shift();

        if (audio) {
          currentAudioRef.current = audio;

          await new Promise<void>((resolve, reject) => {
            audio.onended = () => {
              resolve();
            };
            audio.onerror = (e) => {
              console.error("Audio playback error", e);
              resolve(); // Continue to next even if error
            };

            audio.play().catch(e => {
              console.error("Play failed", e);
              if (e.name === 'NotAllowedError') {
                setError("Autoplay blocked. Tap the screen.");
              }
              resolve();
            });
          });

          // Cleanup current ref
          currentAudioRef.current = null;
        }
      }
    } catch (e) {
      console.error("Queue processing error", e);
    } finally {
      isPlayingRef.current = false;
      // Only turn off synthesizing if queue is empty
      if (audioQueueRef.current.length === 0) {
        setIsSynthesizing(false);
      }
    }
  };

  const enqueueAudio = (text: string) => {
    if (!text.trim()) return;

    const id = crypto.randomUUID();

    // Create the promise immediately to start fetching
    const audioPromise = (async () => {
      try {
        console.log(`[Queue] Fetching TTS for: "${text}"`);
        const buffer = await generateMurfSpeech(text);

        // If disconnected while fetching, discard
        if (connectionStateRef.current !== ConnectionState.CONNECTED) return null;

        const blob = new Blob([buffer], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        // Clean up blob URL when done
        const originalOnEnded = audio.onended;
        audio.onended = (ev) => {
          URL.revokeObjectURL(url);
          if (originalOnEnded) originalOnEnded.call(audio, ev);
        };
        return audio;
      } catch (e) {
        console.error("[Queue] TTS Generation Failed", e);
        return null;
      }
    })();

    audioQueueRef.current.push({ id, audioPromise });
    processAudioQueue();
  };

  const connect = async () => {
    try {
      updateConnectionState(ConnectionState.CONNECTING);
      setError(null);

      // 1. Initialize Input Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioContextRef.current = ctx;

      // 2. Load AudioWorklet (Low-latency processing)
      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await ctx.audioWorklet.addModule(workletUrl);

      // 3. Request Mic Permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 4. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 5. Start Live Session
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            updateConnectionState(ConnectionState.CONNECTED);

            // Setup Input Streaming via AudioWorklet
            if (inputAudioContextRef.current && mediaStreamRef.current) {
              const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
              const workletNode = new AudioWorkletNode(inputAudioContextRef.current, 'pcm-processor');

              workletNode.port.onmessage = (e) => {
                const inputData = e.data as Float32Array;
                const pcmBlob = createBlob(inputData);

                if (sessionPromiseRef.current) {
                  sessionPromiseRef.current.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                  });
                }
              };

              source.connect(workletNode);
              workletNode.connect(inputAudioContextRef.current.destination); // Connect to dest to keep active
              inputWorkletNodeRef.current = workletNode;
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log('Raw Server Message:', JSON.stringify(message));


            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              console.log('Interrupted by user');

              // 1. Stop playback
              if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
              }
              // 2. Clear Queue
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              // 3. Clear Buffers
              ttsBufferRef.current = '';
              currentOutputTranscriptionRef.current = '';
              setIsSynthesizing(false);

              // 4. Finalize pending UI message
              setMessages((prev) => {
                const newMsgs = [...prev];
                for (let i = newMsgs.length - 1; i >= 0; i--) {
                  if (newMsgs[i].role === 'model' && !newMsgs[i].isFinal) {
                    newMsgs[i] = { ...newMsgs[i], isFinal: true };
                    break;
                  }
                }
                return newMsgs;
              });
            }


            // Handle Tool Calls - Check both possible locations
            if (message.toolCall?.functionCalls) {
              // Handle new format: message.toolCall.functionCalls (array)
              for (const functionCall of message.toolCall.functionCalls) {
                const { name, args } = functionCall;
                console.log(`[Tool] Calling ${name} with args:`, args);

                let result: any = {};

                try {
                  if (name === "search_order") {
                    const orderId = (args as any).order_id;
                    console.log(`[Tool] Fetching order ${orderId}...`);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    try {
                      const response = await fetch(`/api/orders/${orderId}`, { signal: controller.signal });
                      result = await response.json();
                    } finally {
                      clearTimeout(timeoutId);
                    }
                  } else if (name === "place_order") {
                    console.log(`[Tool] Placing order with args:`, args);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    try {
                      const response = await fetch('/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(args),
                        signal: controller.signal
                      });
                      result = await response.json();
                    } finally {
                      clearTimeout(timeoutId);
                    }
                  } else if (name === "cancel_order") {
                    const orderId = (args as any).order_id;
                    console.log(`[Tool] Cancelling order ${orderId}...`);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    try {
                      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST', signal: controller.signal });
                      result = await response.json();
                    } finally {
                      clearTimeout(timeoutId);
                    }
                  } else if (name === "check_stock") {
                    let productName = (args as any).product_name;

                    // Normalize common product name abbreviations
                    const nameMapping: Record<string, string> = {
                      'PS5': 'PlayStation 5',
                      'PS 5': 'PlayStation 5',
                      'Playstation 5': 'PlayStation 5',
                      'MacBook M3': 'MacBook Air M3',
                      'iPhone 15': 'iPhone 15 Pro',
                      'S24': 'Samsung Galaxy S24 Ultra',
                      'Galaxy S24': 'Samsung Galaxy S24 Ultra'
                    };

                    productName = nameMapping[productName] || productName;
                    console.log(`[Tool] Checking stock for ${productName}...`);
                    const response = await fetch(`/api/products?search=${encodeURIComponent(productName)}`);
                    const data = await response.json();
                    if (data.products && data.products.length > 0) {
                      result = { status: 'found', products: data.products };
                    } else {
                      result = { status: 'not_found', message: 'Product not found' };
                    }
                  }
                } catch (e) {
                  console.error("[Tool] Execution failed:", e);
                  result = { status: "error", message: "Failed to execute tool" };
                }

                console.log(`[Tool] Execution Result:`, result);

                // Convert result to plain text for Gemini Live API
                let responseText = '';
                if (name === "place_order") {
                  if (result.status === 'success') {
                    responseText = `Order placed successfully! Order ID: ${result.order_id}. Item: ${result.details?.item}, Quantity: ${result.details?.quantity}, Delivery Date: ${result.details?.delivery_date}`;
                  } else {
                    responseText = `Failed to place order: ${result.message}`;
                  }
                } else if (name === "search_order") {
                  if (result.status === 'found') {
                    const order = result.order;
                    responseText = `Order ${order.id} found. Customer: ${order.customer_name}, Product: ${order.product_name}, Quantity: ${order.quantity}, Status: ${order.status}, Delivery Date: ${order.delivery_date}`;
                  } else {
                    responseText = `Order not found`;
                  }
                } else if (name === "cancel_order") {
                  responseText = result.status === 'success' ? 'Order cancelled successfully' : `Failed to cancel: ${result.message}`;
                } else if (name === "check_stock") {
                  if (result.status === 'found' && result.products?.length > 0) {
                    const product = result.products[0];
                    responseText = `Product found: ${product.name}, Price: ₹${product.price}, Stock: ${product.stock} units available`;
                  } else {
                    responseText = 'Product not found in our inventory';
                  }
                }

                // Send Tool Response
                if (sessionPromiseRef.current) {
                  console.log("[Tool] Sending response to Gemini:", responseText);
                  try {
                    const session = await sessionPromiseRef.current;
                    await session.sendToolResponse({
                      functionResponses: [{
                        id: functionCall.id,
                        name: name,  // Required by Gemini Live API
                        response: {
                          result: responseText
                        }
                      }]
                    });
                    console.log("[Tool] Response sent successfully!");
                  } catch (err) {
                    console.error("[Tool] Failed to send response:", err);
                  }
                } else {
                  console.error("[Tool] Session Promise is null!");
                }
              }
            }

            // Handle Transcription
            const outputTx = message.serverContent?.outputTranscription;
            const inputTx = message.serverContent?.inputTranscription;

            if (outputTx?.text) {
              // Strip markdown to ensure clean TTS
              const textChunk = outputTx.text.replace(/[\*\[\]]/g, '');
              currentOutputTranscriptionRef.current += textChunk;
              addMessage('model', currentOutputTranscriptionRef.current, false);

              // Low Latency Streaming: Accumulate text and split by sentence
              ttsBufferRef.current += textChunk;

              // Aggressive streaming regex: Match sentence endings followed by whitespace OR end-of-string.
              const sentenceRegex = /(.+?[.!?])(?:\s+|$)/;
              const fallbackRegex = /(.+?[,;])(?:\s+|$)/;

              while (true) {
                let match = ttsBufferRef.current.match(sentenceRegex);

                // Safety valve: if buffer is too long (>50 chars), accept commas/semicolons to avoid stalling
                if (!match && ttsBufferRef.current.length > 50) {
                  match = ttsBufferRef.current.match(fallbackRegex);
                }

                if (match) {
                  const sentence = match[1].trim();
                  const fullMatchLength = match[0].length;
                  ttsBufferRef.current = ttsBufferRef.current.slice(fullMatchLength).trimStart();

                  if (sentence) {
                    enqueueAudio(sentence);
                  }
                } else {
                  break;
                }
              }
            }

            if (inputTx?.text) {
              currentInputTranscriptionRef.current += inputTx.text;
              addMessage('user', currentInputTranscriptionRef.current, false);
            }

            // Handle Turn Complete
            if (message.serverContent?.turnComplete) {
              // Finalize user message
              if (currentInputTranscriptionRef.current) {
                addMessage('user', currentInputTranscriptionRef.current, true);
                currentInputTranscriptionRef.current = '';
              }
              // Finalize model message
              if (currentOutputTranscriptionRef.current) {
                addMessage('model', currentOutputTranscriptionRef.current, true);
                currentOutputTranscriptionRef.current = '';
              }

              // Flush any remaining text in the buffer (e.g., the final sentence)
              if (ttsBufferRef.current.trim().length > 0) {
                enqueueAudio(ttsBufferRef.current);
                ttsBufferRef.current = '';
              }
            }
          },
          onclose: () => {
            console.log('Session closed');
            updateConnectionState(ConnectionState.DISCONNECTED);
            setIsSynthesizing(false);
          },
          onerror: (err) => {
            console.error('Session error:', err);
            setError("Connection encountered an error.");
            updateConnectionState(ConnectionState.ERROR);
            setIsSynthesizing(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: tools, // Add tools here
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      updateConnectionState(ConnectionState.ERROR);
      setError(`Failed to initialize: ${e.message}`);
      setIsSynthesizing(false);
    }
  };

  const disconnect = () => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }

    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    if (inputWorkletNodeRef.current) {
      inputWorkletNodeRef.current.disconnect();
      inputWorkletNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Stop Playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    ttsBufferRef.current = '';

    updateConnectionState(ConnectionState.DISCONNECTED);
    setIsSynthesizing(false);
  };

  const handleToggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans">
      <Header isConnected={connectionState === ConnectionState.CONNECTED} onTestAudio={handleTestAudio} />

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className="text-center max-w-xs">
              Tap the microphone to start a conversation with the Lumina Support Agent.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))
        )}

        {/* Synthesizing Indicator */}
        {isSynthesizing && (
          <div className="flex justify-start w-full mb-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-xs text-indigo-300">Speaking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Error Banner - Fixed Position */}
      {error && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-3/4 max-w-md bg-red-900/90 border border-red-700 text-red-100 px-4 py-3 rounded-lg shadow-lg text-sm text-center z-50">
          <p className="font-semibold mb-1">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Control Bar */}
      <footer className="p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-center relative z-20">
        <button
          onClick={handleToggleConnection}
          className={`
            relative group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-xl
            ${connectionState === ConnectionState.CONNECTED
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
              : connectionState === ConnectionState.CONNECTING
                ? 'bg-amber-500 cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'
            }
          `}
        >
          {connectionState === ConnectionState.CONNECTING ? (
            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : connectionState === ConnectionState.CONNECTED ? (
            // Hangup Icon
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
            </svg>
          ) : (
            // Mic Icon
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
          )}

          {/* Ring Animation when active */}
          {connectionState === ConnectionState.CONNECTED && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping"></span>
          )}
        </button>
      </footer>
    </div>
  );
};

export default AgentInterface;
