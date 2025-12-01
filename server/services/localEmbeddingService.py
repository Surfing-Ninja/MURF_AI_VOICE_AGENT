#!/usr/bin/env python3
"""
Local Embedding Service using SBERT
Replaces Gemini embedding API to avoid quota issues
"""

from sentence_transformers import SentenceTransformer
from flask import Flask, request, jsonify
import numpy as np
import sys

# Initialize SBERT model (all-MiniLM-L6-v2 is fast and good quality)
print("[SBERT] Loading model: all-MiniLM-L6-v2...", file=sys.stderr)
model = SentenceTransformer('all-MiniLM-L6-v2')
print("[SBERT] ✓ Model loaded", file=sys.stderr)

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "model": "all-MiniLM-L6-v2"})

@app.route('/embed', methods=['POST'])
def embed():
    try:
        data = request.json
        text = data.get('text', '')
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Generate embedding
        embedding = model.encode(text, convert_to_numpy=True)
        
        # Convert to list for JSON serialization
        embedding_list = embedding.tolist()
        
        print(f"[SBERT] ✓ Generated embedding (dimension: {len(embedding_list)})", file=sys.stderr)
        
        return jsonify({
            "embedding": embedding_list,
            "dimension": len(embedding_list),
            "model": "all-MiniLM-L6-v2"
        })
        
    except Exception as e:
        print(f"[SBERT] ❌ Error: {str(e)}", file=sys.stderr)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("[SBERT] 🚀 Starting local embedding service on http://localhost:5001", file=sys.stderr)
    app.run(host='0.0.0.0', port=5001, debug=False)
