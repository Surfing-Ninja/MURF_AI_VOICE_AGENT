#!/usr/bin/env node

/**
 * Dynamic RAG Ingestion Script
 * 
 * Usage: node scripts/ingest.js <file-path>
 * Example: node scripts/ingest.js ./documents/terms.txt
 * 
 * This script:
 * 1. Reads a text file from the provided path
 * 2. Splits it into chunks (~1000 characters)
 * 3. Generates embeddings using Gemini text-embedding-004
 * 4. Upserts vectors to Pinecone with text as metadata
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateEmbedding } from '../services/geminiService.js';
import { upsertVectors, getIndexStats } from '../services/ragService.js';

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Split text into chunks of approximately maxChunkSize characters
 * Tries to split at sentence boundaries for better semantic coherence
 * @param {string} text - Text to split
 * @param {number} maxChunkSize - Maximum chunk size in characters
 * @returns {Array<string>} - Array of text chunks
 */
function chunkText(text, maxChunkSize = 1000) {
  const chunks = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    
    if (!trimmedParagraph) continue;
    
    // If adding this paragraph would exceed chunk size
    if (currentChunk.length + trimmedParagraph.length > maxChunkSize) {
      // Save current chunk if it has content
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // If paragraph itself is too large, split it by sentences
      if (trimmedParagraph.length > maxChunkSize) {
        const sentences = trimmedParagraph.match(/[^.!?]+[.!?]+/g) || [trimmedParagraph];
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkSize) {
            if (currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
          } else {
            currentChunk += ' ' + sentence;
          }
        }
      } else {
        currentChunk = trimmedParagraph;
      }
    } else {
      currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + trimmedParagraph;
    }
  }
  
  // Add the last chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Generate a unique ID for a vector
 * @param {string} filename - Source filename
 * @param {number} index - Chunk index
 * @returns {string} - Unique vector ID
 */
function generateVectorId(filename, index) {
  const timestamp = Date.now();
  const cleanFilename = path.basename(filename, path.extname(filename))
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  return `${cleanFilename}_chunk_${index}_${timestamp}`;
}

/**
 * Main ingestion function
 * @param {string} filePath - Path to the text file to ingest
 */
async function ingestFile(filePath) {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  🚀 RAG Ingestion Script');
    console.log('═══════════════════════════════════════════════════════════');
    console.log();

    // Validate file path
    if (!filePath) {
      throw new Error('No file path provided. Usage: node scripts/ingest.js <file-path>');
    }

    // Resolve absolute path
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(process.cwd(), filePath);

    console.log(`📄 Reading file: ${absolutePath}`);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    // Read file content
    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    const fileSize = (fileContent.length / 1024).toFixed(2);
    
    console.log(`✓ File loaded: ${fileSize} KB`);
    console.log();

    // Split into chunks
    console.log('✂️  Chunking text...');
    const chunks = chunkText(fileContent, 1000);
    console.log(`✓ Created ${chunks.length} chunks`);
    console.log();

    // Generate embeddings and prepare vectors
    console.log('🧬 Generating embeddings...');
    const vectors = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      process.stdout.write(`  Processing chunk ${i + 1}/${chunks.length}...`);
      
      try {
        // Generate embedding using Gemini
        const embedding = await generateEmbedding(chunk);
        
        // Create vector object
        const vector = {
          id: generateVectorId(filePath, i),
          values: embedding,
          metadata: {
            text: chunk,
            source: path.basename(filePath),
            chunkIndex: i,
            totalChunks: chunks.length,
            chunkLength: chunk.length,
            ingestedAt: new Date().toISOString()
          }
        };
        
        vectors.push(vector);
        process.stdout.write(' ✓\n');
        
      } catch (error) {
        process.stdout.write(' ❌\n');
        console.error(`  Error processing chunk ${i + 1}:`, error.message);
      }
    }

    console.log();
    console.log(`✓ Generated ${vectors.length} embeddings`);
    console.log();

    // Upsert to Pinecone
    console.log('📤 Uploading to Pinecone...');
    await upsertVectors(vectors);
    console.log('✓ Upload complete');
    console.log();

    // Show index statistics
    console.log('📊 Index Statistics:');
    const stats = await getIndexStats();
    console.log(`  Total vectors: ${stats.totalRecordCount}`);
    console.log(`  Dimension: ${stats.dimension}`);
    console.log();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ Ingestion Complete!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log();
    console.log(`Ingested: ${chunks.length} chunks from ${path.basename(filePath)}`);
    console.log(`Total vectors in index: ${stats.totalRecordCount}`);
    console.log();

  } catch (error) {
    console.error();
    console.error('═══════════════════════════════════════════════════════════');
    console.error('  ❌ Ingestion Failed');
    console.error('═══════════════════════════════════════════════════════════');
    console.error();
    console.error('Error:', error.message);
    console.error();
    
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Get file path from command line arguments
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Error: No file path provided');
  console.error();
  console.error('Usage: node scripts/ingest.js <file-path>');
  console.error();
  console.error('Examples:');
  console.error('  node scripts/ingest.js ./documents/terms.txt');
  console.error('  node scripts/ingest.js ./documents/faq.txt');
  console.error('  node scripts/ingest.js /absolute/path/to/policy.txt');
  console.error();
  process.exit(1);
}

// Run ingestion
ingestFile(filePath);
