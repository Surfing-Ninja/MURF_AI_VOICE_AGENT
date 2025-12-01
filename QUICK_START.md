# Quick Start - Gemini Live Voice Agent

## Start All Services

### Terminal 1: SBERT (Embeddings)
```bash
cd server
python services/localEmbeddingService.py
```

### Terminal 2: Gemini Live Server
```bash
cd server
npm run live
```

### Terminal 3: Frontend
```bash
cd client
npm run dev
```

## Open Browser
Navigate to `http://localhost:5173` (or the port shown in Terminal 3)

## Usage
1. Click **"Start Talking"**
2. Speak your question (e.g., "What are the Diwali offers?")
3. Click **"Stop Talking"**
4. Listen to Samar's response!

## Expected Behavior
- First response: **~1-2 seconds** ⚡
- Natural Indian voice (Murf Falcon)
- RAG-powered accurate answers
- No robotic delays

---

**Architecture**: Audio → Gemini Live → Murf TTS → Audio (2 hops only!)
