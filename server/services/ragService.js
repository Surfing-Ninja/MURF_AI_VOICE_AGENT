/**
 * RAG Service - Memory Layer (Retrieval-Augmented Generation)
 * Uses Pinecone for vector storage and retrieval
 * Embeddings generated via Gemini text-embedding-004
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbedding } from './geminiService.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Pinecone client
let pineconeClient = null;
let pineconeIndex = null;

/**
 * Initialize Pinecone connection
 * @returns {Promise<void>}
 */
async function initializePinecone() {
  if (pineconeClient && pineconeIndex) {
    return; // Already initialized
  }

  try {
    console.log('[Pinecone] Initializing connection...');

    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY not configured');
    }

    if (!process.env.PINECONE_INDEX_NAME) {
      throw new Error('PINECONE_INDEX_NAME not configured');
    }

    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    // Connect to the index
    pineconeIndex = pineconeClient.index(process.env.PINECONE_INDEX_NAME);

    console.log(`[Pinecone] ✓ Connected to index: ${process.env.PINECONE_INDEX_NAME}`);

  } catch (error) {
    console.error('[Pinecone] ❌ Initialization failed:', error);
    throw error;
  }
}

/**
 * Query Pinecone for relevant context based on user query
 * @param {string} queryText - User's question/query
 * @param {number} topK - Number of results to return (default: 3)
 * @returns {Promise<string>} - Concatenated relevant context from knowledge base
 */
export async function queryContext(queryText, topK = 2) {
  try {
    console.log(`[RAG] 🔍 Querying knowledge base: "${queryText.substring(0, 50)}..."`);

    // Ensure Pinecone is initialized
    await initializePinecone();

    // Generate embedding for the query using Gemini
    const queryEmbedding = await generateEmbedding(queryText);

    // Query Pinecone for similar vectors
    const queryResponse = await pineconeIndex.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true
    });

    // Extract and format results
    const matches = queryResponse.matches || [];

    if (matches.length === 0) {
      console.log('[RAG] No relevant context found in knowledge base');
      return '';
    }

    console.log(`[RAG] ✓ Found ${matches.length} relevant context chunks`);

    // Log all matches first
    matches.forEach((match, idx) => {
      const score = match.score.toFixed(3);
      const text = match.metadata?.text || '';
      console.log(`[RAG]   Match ${idx + 1}: Score ${score}, Text: "${text.substring(0, 60)}..."`);
    });

    // Concatenate metadata text - LOWER threshold for better recall
    const contextPieces = matches
      .filter(match => match.score > 0.35) // Lowered from 0.5 to 0.35
      .map(match => match.metadata?.text || '')
      .filter(text => text.length > 0);

    if (contextPieces.length === 0) {
      console.log('[RAG] No relevant matches found (threshold: 0.35)');
      return '';
    }

    // Join context - limit to 300 chars for speed
    const fullContext = contextPieces.join('\n\n').substring(0, 300);

    console.log(`[RAG] ✓ Retrieved ${fullContext.length} characters of context`);

    return fullContext;

  } catch (error) {
    console.error('[RAG] ❌ Error querying context:', error);

    // Return empty string on error (don't break the flow)
    return '';
  }
}

/**
 * Upsert vectors to Pinecone (used by ingest script)
 * @param {Array<Object>} vectors - Array of {id, values, metadata} objects
 * @returns {Promise<void>}
 */
export async function upsertVectors(vectors) {
  try {
    console.log(`[RAG] 📤 Upserting ${vectors.length} vectors to Pinecone...`);

    // Ensure Pinecone is initialized
    await initializePinecone();

    // Batch upsert (Pinecone recommends batches of 100-200)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await pineconeIndex.upsert(batch);
      console.log(`[RAG] ✓ Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
    }

    console.log(`[RAG] ✓ Successfully upserted ${vectors.length} vectors`);

  } catch (error) {
    console.error('[RAG] ❌ Error upserting vectors:', error);
    throw error;
  }
}

/**
 * Delete all vectors from index (use with caution!)
 * @returns {Promise<void>}
 */
export async function clearIndex() {
  try {
    console.log('[RAG] ⚠️  Clearing all vectors from index...');

    await initializePinecone();

    // Delete all vectors (use deleteAll with caution!)
    await pineconeIndex.deleteAll();

    console.log('[RAG] ✓ Index cleared successfully');

  } catch (error) {
    console.error('[RAG] ❌ Error clearing index:', error);
    throw error;
  }
}

/**
 * Get index statistics
 * @returns {Promise<Object>} - Index stats (vector count, dimension, etc.)
 */
export async function getIndexStats() {
  try {
    await initializePinecone();

    const stats = await pineconeIndex.describeIndexStats();

    console.log('[RAG] Index Statistics:', {
      totalVectorCount: stats.totalRecordCount,
      dimension: stats.dimension,
      namespaces: stats.namespaces
    });

    return stats;

  } catch (error) {
    console.error('[RAG] ❌ Error getting index stats:', error);
    throw error;
  }
}

/**
 * Check if RAG service is ready
 * @returns {Promise<boolean>}
 */
export async function isReady() {
  try {
    await initializePinecone();
    const stats = await getIndexStats();
    return stats.totalRecordCount > 0;
  } catch (error) {
    console.error('[RAG] Service not ready:', error);
    return false;
  }
}

export default {
  queryContext,
  upsertVectors,
  clearIndex,
  getIndexStats,
  isReady
};
