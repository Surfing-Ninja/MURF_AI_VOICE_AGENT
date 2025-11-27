/**
 * AI Controller - Gemini 2.0 Flash Exp
 * Handles AI response generation with TOON format output
 * Integrates RAG for context-aware responses
 * TOON Format: response[1]{text,emotion}: <text>,<emotion>
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { queryContext } from './services/ragService.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simple in-memory cache for common queries (max 50 entries, 5 min TTL)
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

/**
 * Generate cache key from user text
 */
function getCacheKey(text) {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
}

/**
 * Get cached response if available and not expired
 */
function getCachedResponse(userText) {
  const key = getCacheKey(userText);
  const cached = responseCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[AI Controller] 🚀 Using cached response');
    return { ...cached.response };
  }
  
  return null;
}

/**
 * Cache a response
 */
function cacheResponse(userText, response) {
  const key = getCacheKey(userText);
  
  // Implement simple LRU by clearing oldest entries
  if (responseCache.size >= MAX_CACHE_SIZE) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  
  responseCache.set(key, {
    response: { ...response },
    timestamp: Date.now()
  });
}

// System prompt with strict TOON format requirements
const SYSTEM_PROMPT = `Fast voice assistant. Output ONLY: response[1]{text,emotion}: <text>,<emotion>
Emotions: happy, sad, angry, neutral. Keep under 20 words.

Examples:
User: "What's your refund policy?"
response[1]{text,emotion}: We offer 30-day money-back guarantee,neutral

User: "I'm frustrated"
response[1]{text,emotion}: I understand. Let me help you now,sad

User: "Thank you!"
response[1]{text,emotion}: You're welcome! Happy to help,happy`;

/**
 * Generate AI response using Gemini 2.0 Flash Exp
 * @param {string} userText - User's input text/transcript
 * @param {Array} history - Optional conversation history (future use)
 * @returns {Promise<Object>} - Parsed response with text and emotion
 */
export async function generateResponse(userText, history = []) {
  try {
    console.log('[AI Controller] Generating response for:', userText);

    // Validate input
    if (!userText || userText.trim().length === 0) {
      throw new Error('User text cannot be empty');
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Check cache first
    const cached = getCachedResponse(userText);
    if (cached) {
      return cached;
    }

    // Query RAG for relevant context in parallel with model initialization
    const ragPromise = queryContext(userText).catch(err => {
      console.warn('[AI Controller] ⚠️ RAG query failed (continuing without context):', err.message);
      return '';
    });

    // Initialize model with system instruction
    // Using gemini-2.0-flash-exp for fastest responses (optimized for speed)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100, // Limit output for faster generation
      }
    });

    // Wait for RAG context
    const ragContext = await ragPromise;
    
    if (ragContext) {
      console.log('[AI Controller] ✓ RAG context retrieved');
    } else {
      console.log('[AI Controller] No relevant RAG context found');
    }

    // Build prompt with RAG context and history
    let prompt = '';
    
    // Add RAG context if available (simplified for speed)
    if (ragContext && ragContext.trim().length > 0) {
      prompt += `Context: ${ragContext}\n\n`;
    }
    
    // Add minimal conversation history (only last exchange for speed)
    if (history && history.length > 0) {
      const lastExchange = history[history.length - 1];
      prompt += `Last: User: ${lastExchange.user}\nYou: ${lastExchange.assistant}\n\n`;
    }
    
    prompt += `User: ${userText}`;

    console.log('[AI Controller] Sending prompt to Gemini...');

    // Generate response
    const result = await model.generateContent(prompt);
    const response = result.response;
    const rawText = response.text();

    console.log('[AI Controller] Raw response:', rawText);

    // Parse TOON format
    const parsedResponse = parseToon(rawText);
    
    // Add RAG context flag to response
    parsedResponse.hadRagContext = !!ragContext;

    console.log('[AI Controller] Parsed response:', parsedResponse);

    // Cache the response for future use
    cacheResponse(userText, parsedResponse);

    return parsedResponse;

  } catch (error) {
    console.error('[AI Controller] Error generating response:', error);
    
    // Return fallback response in TOON format
    return {
      text: "I'm having trouble processing that. Please try again.",
      emotion: 'neutral',
      error: error.message
    };
  }
}

/**
 * Parse TOON format response
 * Format: response[1]{text,emotion}: <text>,<emotion>
 * @param {string} responseString - Raw response from Gemini
 * @returns {Object} - Parsed object with text and emotion
 */
export function parseToon(responseString) {
  try {
    console.log('[AI Controller] Parsing TOON format...');

    // Regex pattern to match TOON format
    // Pattern: response[N]{text,emotion}: text_content,emotion_value
    const toonRegex = /response\[\d+\]\{text,emotion\}:\s*(.+?),\s*(happy|sad|angry|neutral)/i;
    
    const match = responseString.match(toonRegex);

    if (match) {
      const [, text, emotion] = match;
      
      console.log('[AI Controller] ✓ TOON parsed successfully');
      
      return {
        text: text.trim(),
        emotion: emotion.toLowerCase(),
        raw: responseString
      };
    }

    // Fallback: Try alternative parsing if strict format fails
    console.warn('[AI Controller] ⚠️ Strict TOON format not found, attempting fallback parsing...');
    
    // Try to extract text and emotion separately
    const textMatch = responseString.match(/:\s*(.+?),/);
    const emotionMatch = responseString.match(/,\s*(happy|sad|angry|neutral)/i);
    
    if (textMatch && emotionMatch) {
      console.log('[AI Controller] ✓ Fallback parsing successful');
      return {
        text: textMatch[1].trim(),
        emotion: emotionMatch[1].toLowerCase(),
        raw: responseString
      };
    }

    // If all parsing fails, return the raw text with neutral emotion
    console.warn('[AI Controller] ⚠️ Could not parse TOON format, using raw response');
    
    return {
      text: responseString.replace(/response\[\d+\]\{.*?\}:\s*/, '').trim(),
      emotion: 'neutral',
      raw: responseString,
      parseWarning: 'Response was not in expected TOON format'
    };

  } catch (error) {
    console.error('[AI Controller] Error parsing TOON:', error);
    
    // Return raw string with neutral emotion as last resort
    return {
      text: responseString,
      emotion: 'neutral',
      raw: responseString,
      parseError: error.message
    };
  }
}

/**
 * Validate TOON format response
 * @param {Object} parsedResponse - Parsed TOON response
 * @returns {boolean} - True if valid
 */
export function validateToonResponse(parsedResponse) {
  const validEmotions = ['happy', 'sad', 'angry', 'neutral'];
  
  // Check if text exists and is under 20 words
  if (!parsedResponse.text || parsedResponse.text.trim().length === 0) {
    return false;
  }
  
  const wordCount = parsedResponse.text.split(/\s+/).length;
  if (wordCount > 20) {
    console.warn(`[AI Controller] ⚠️ Text exceeds 20 words (${wordCount} words)`);
  }
  
  // Check if emotion is valid
  if (!validEmotions.includes(parsedResponse.emotion)) {
    console.warn(`[AI Controller] ⚠️ Invalid emotion: ${parsedResponse.emotion}`);
    return false;
  }
  
  return true;
}

export default {
  generateResponse,
  parseToon,
  validateToonResponse
};
