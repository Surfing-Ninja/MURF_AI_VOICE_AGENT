/**
 * Gemini Service - The Brain (Multimodal AI + Agentic Tools)
 * Uses Gemini 2.0 Flash-Lite for fast, intelligent responses
 * Supports TOON format output, multimodal inputs (text + vision), and tool execution
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Cache for embeddings to avoid duplicate API calls
const embeddingCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 3600000; // 1 hour

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms between requests (was 100ms)

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model configuration
const MODEL_NAME = 'gemini-2.0-flash-exp';
const EMBEDDING_MODEL = 'text-embedding-004';

// System prompt with TOON format instructions
const SYSTEM_PROMPT = `You are a helpful, empathetic customer support agent. Your goal is to assist users with their inquiries efficiently and professionally.

CRITICAL RESPONSE FORMAT (TOON - Token-Oriented Object Notation):
You MUST respond in this exact format:
response[1]{text, emotion, action}: [Your response text here]

Example responses:
response[1]{text, emotion, action}: I'd be happy to help you with your refund request!
response[1]{text, emotion, action, tool:processRefund}: Let me process that refund for you right away.
response[1]{text, emotion:empathetic, action}: I completely understand your frustration. Let me see what I can do.

RULES:
1. Always use the response[1]{...} format
2. Include emotion only when it adds value (happy, sad, empathetic, professional, urgent, calm, excited)
3. Include action when user needs to take specific steps
4. Include tool:[toolName] when you need to execute a tool
5. Keep responses conversational and helpful
6. If you have access to context from the knowledge base, use it to provide accurate information

AVAILABLE TOOLS:
- processRefund: Process refund requests (requires order ID)
- updateAddress: Update customer shipping address
- checkOrderStatus: Check order status and tracking
- escalateToHuman: Escalate complex issues to human agent

When you need to use a tool, include it in your TOON response like:
response[1]{text, emotion, action, tool:processRefund, orderId:12345}: I've processed your refund for order 12345.`;

/**
 * Agentic Tools - Mock implementations
 * In production, these would call actual APIs/databases
 */
const AGENT_TOOLS = {
  processRefund: async (orderId) => {
    console.log(`[Tool] Processing refund for order: ${orderId}`);
    // Mock implementation
    return {
      success: true,
      orderId: orderId,
      refundAmount: 49.99,
      estimatedDays: 5,
      message: `Refund initiated for order ${orderId}. You'll receive $49.99 in 5-7 business days.`
    };
  },

  updateAddress: async (newAddress) => {
    console.log(`[Tool] Updating address:`, newAddress);
    // Mock implementation
    return {
      success: true,
      message: `Address updated successfully to: ${newAddress}`,
      confirmationCode: 'ADDR' + Math.random().toString(36).substring(7).toUpperCase()
    };
  },

  checkOrderStatus: async (orderId) => {
    console.log(`[Tool] Checking order status: ${orderId}`);
    // Mock implementation
    const statuses = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
    return {
      success: true,
      orderId: orderId,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      trackingNumber: 'TRK' + Math.random().toString(36).substring(7).toUpperCase(),
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    };
  },

  escalateToHuman: async (reason) => {
    console.log(`[Tool] Escalating to human agent. Reason: ${reason}`);
    // Mock implementation
    return {
      success: true,
      ticketId: 'TKT' + Math.random().toString(36).substring(7).toUpperCase(),
      message: 'Your request has been escalated to our support team. Someone will contact you within 1 hour.',
      estimatedWaitTime: '15-30 minutes'
    };
  }
};

/**
 * Parse TOON-formatted response
 * @param {string} response - Raw response from Gemini
 * @returns {Object} - Parsed TOON object with text, emotion, action, tool
 */
function parseTOON(response) {
  try {
    // Match pattern: response[1]{...}: text
    const toonRegex = /response\[(\d+)\]\{([^}]+)\}:\s*(.+)/;
    const match = response.match(toonRegex);

    if (!match) {
      // Fallback if response doesn't match TOON format
      console.warn('[Gemini] Response not in TOON format, using as-is');
      return {
        text: response,
        emotion: 'professional',
        action: null,
        tool: null
      };
    }

    const [, index, properties, text] = match;

    // Parse properties
    const props = {};
    properties.split(',').forEach(prop => {
      const [key, value] = prop.trim().split(':');
      if (value) {
        props[key.trim()] = value.trim();
      } else {
        props[key.trim()] = true;
      }
    });

    return {
      index: parseInt(index),
      text: text.trim(),
      emotion: props.emotion || 'professional',
      action: props.action || null,
      tool: props.tool || null,
      toolParams: props
    };

  } catch (error) {
    console.error('[Gemini] Error parsing TOON:', error);
    return {
      text: response,
      emotion: 'professional',
      action: null,
      tool: null
    };
  }
}

/**
 * Execute agent tool if requested in TOON response
 * @param {Object} toonResponse - Parsed TOON response
 * @returns {Promise<Object>} - Tool execution result
 */
async function executeToolIfNeeded(toonResponse) {
  if (!toonResponse.tool) {
    return null;
  }

  const toolName = toonResponse.tool;
  const toolFunction = AGENT_TOOLS[toolName];

  if (!toolFunction) {
    console.warn(`[Gemini] Unknown tool: ${toolName}`);
    return { error: `Tool ${toolName} not found` };
  }

  try {
    console.log(`[Gemini] 🔧 Executing tool: ${toolName}`);

    // Extract tool parameters from TOON response
    const params = toonResponse.toolParams;

    // Execute tool based on type
    let result;
    switch (toolName) {
      case 'processRefund':
        result = await toolFunction(params.orderId);
        break;
      case 'updateAddress':
        result = await toolFunction(params.address);
        break;
      case 'checkOrderStatus':
        result = await toolFunction(params.orderId);
        break;
      case 'escalateToHuman':
        result = await toolFunction(params.reason || 'User request');
        break;
      default:
        result = await toolFunction(params);
    }

    console.log(`[Gemini] ✓ Tool executed successfully:`, result);
    return result;

  } catch (error) {
    console.error(`[Gemini] Error executing tool ${toolName}:`, error);
    return { error: error.message };
  }
}

/**
 * Generate AI response with multimodal support (text + vision)
 * @param {string} audioTranscript - Transcribed user speech
 * @param {string} contextFromRAG - Retrieved context from RAG/Pinecone
 * @param {string} imageBase64 - Optional base64-encoded image for "Look Over My Shoulder"
 * @returns {Promise<Object>} - Parsed TOON response with tool execution results
 */
export async function generateResponse(audioTranscript, contextFromRAG = '', imageBase64 = null) {
  try {
    console.log(`[Gemini] 🧠 Processing request...`);
    console.log(`[Gemini] Transcript: "${audioTranscript}"`);
    console.log(`[Gemini] Has Context: ${!!contextFromRAG}`);
    console.log(`[Gemini] Has Image: ${!!imageBase64}`);

    // Select model based on whether we have vision input
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT
    });

    // Build prompt with context
    let prompt = `User Query: ${audioTranscript}\n\n`;

    if (contextFromRAG) {
      prompt += `Relevant Context from Knowledge Base:\n${contextFromRAG}\n\n`;
    }

    prompt += `Please provide a helpful response in TOON format.`;

    // Prepare content parts (text + optional image)
    const parts = [{ text: prompt }];

    if (imageBase64) {
      console.log('[Gemini] 👁️ Including vision analysis (Look Over My Shoulder)');
      // Add image for multimodal analysis
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64
        }
      });
      parts.push({
        text: '\nThe user has shared their screen. Please analyze what you see and incorporate it into your response.'
      });
    }

    // Generate response
    const result = await model.generateContent(parts);
    const response = result.response;
    const rawText = response.text();

    console.log(`[Gemini] Raw response: ${rawText}`);

    // Parse TOON format
    const toonResponse = parseTOON(rawText);
    console.log('[Gemini] Parsed TOON:', toonResponse);

    // Execute tool if needed
    const toolResult = await executeToolIfNeeded(toonResponse);

    if (toolResult) {
      toonResponse.toolResult = toolResult;

      // If tool execution returned additional info, append it to response text
      if (toolResult.message) {
        toonResponse.text += ` ${toolResult.message}`;
      }
    }

    return toonResponse;

  } catch (error) {
    console.error('[Gemini] ❌ Error generating response:', error);

    // Return error in TOON format
    return {
      text: "I apologize, but I'm having trouble processing your request right now. Please try again.",
      emotion: 'empathetic',
      action: null,
      tool: null,
      error: error.message
    };
  }
}

/**
 * Generate embeddings for text using LOCAL SBERT service
 * @param {string} text - Text to embed  
 * @returns {Promise<Array<number>>} - Embedding vector
 */
export async function generateEmbedding(text) {
  try {
    // Check cache first
    const cacheKey = text.substring(0, 200);
    const cached = embeddingCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('[SBERT] ⚡ Using cached embedding');
      return cached.embedding;
    }

    console.log(`[SBERT] Generating embedding for text: "${text.substring(0, 50)}..."`);

    // Call local SBERT service (no API quota!)
    const response = await fetch('http://localhost:5001/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`SBERT service error: ${response.status}`);
    }

    const data = await response.json();
    const embedding = data.embedding;

    if (!embedding || embedding.length === 0) {
      throw new Error('Embedding generation failed - empty result');
    }

    console.log(`[SBERT] ✓ Embedding generated (dimension: ${embedding.length})`);

    // Cache the result
    embeddingCache.set(cacheKey, {
      embedding,
      timestamp: Date.now()
    });

    // Limit cache size
    if (embeddingCache.size > CACHE_MAX_SIZE) {
      const firstKey = embeddingCache.keys().next().value;
      embeddingCache.delete(firstKey);
    }

    return embedding;

  } catch (error) {
    console.error('[SBERT] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Chat with streaming support (for future real-time responses)
 */
export async function generateResponseStreaming(audioTranscript, contextFromRAG = '', onChunk) {
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT
    });

    let prompt = `User Query: ${audioTranscript}\n\n`;
    if (contextFromRAG) {
      prompt += `Relevant Context:\n${contextFromRAG}\n\n`;
    }
    prompt += `Respond in TOON format.`;

    const result = await model.generateContentStream([{ text: prompt }]);

    let fullResponse = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;

      if (onChunk && typeof onChunk === 'function') {
        onChunk(chunkText);
      }
    }

    return parseTOON(fullResponse);

  } catch (error) {
    console.error('[Gemini] Error in streaming response:', error);
    throw error;
  }
}

export default {
  generateResponse,
  generateEmbedding,
  generateResponseStreaming,
  parseTOON
};
