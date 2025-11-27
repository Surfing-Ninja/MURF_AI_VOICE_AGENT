/**
 * AI Controller - Gemini 2.0 Flash-Lite
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

// System prompt with strict TOON format requirements
const SYSTEM_PROMPT = `You are a fast voice assistant. Output ONLY in TOON format: response[1]{text,emotion}: <text>,<emotion>. Emotions: happy, sad, angry, neutral. Keep text under 20 words.

CRITICAL RULES:
1. ALWAYS use the exact format: response[1]{text,emotion}: <text>,<emotion>
2. Text must be under 20 words
3. Emotion must be one of: happy, sad, angry, neutral
4. No extra text before or after the TOON format
5. Be concise and direct in responses

Examples:
User: "What's your refund policy?"
response[1]{text,emotion}: We offer a 30-day money-back guarantee,neutral

User: "I'm frustrated with this service"
response[1]{text,emotion}: I understand your frustration. Let me help you right away,sad

User: "Thank you so much!"
response[1]{text,emotion}: You're very welcome! Happy to help,happy`;

/**
 * Generate AI response using Gemini 2.0 Flash-Lite
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

    // Query RAG for relevant context
    let ragContext = '';
    try {
      console.log('[AI Controller] 🔍 Querying RAG for context...');
      ragContext = await queryContext(userText);
      if (ragContext) {
        console.log('[AI Controller] ✓ RAG context retrieved');
      } else {
        console.log('[AI Controller] No relevant RAG context found');
      }
    } catch (ragError) {
      console.warn('[AI Controller] ⚠️ RAG query failed (continuing without context):', ragError.message);
    }

    // Initialize model with system instruction
    // Using gemini-2.0-flash for fast responses
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT
    });

    // Build prompt with RAG context and history
    let prompt = '';
    
    // Add RAG context if available
    if (ragContext && ragContext.trim().length > 0) {
      prompt += `Relevant Knowledge Base Context:\n${ragContext}\n\n`;
      prompt += 'Use the above context to inform your response if relevant.\n\n';
    }
    
    // Add conversation history
    if (history && history.length > 0) {
      const recentHistory = history.slice(-3); // Last 3 exchanges
      prompt += 'Recent conversation:\n';
      recentHistory.forEach(exchange => {
        prompt += `User: ${exchange.user}\n`;
        prompt += `Assistant: ${exchange.assistant}\n`;
      });
      prompt += '\n';
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
