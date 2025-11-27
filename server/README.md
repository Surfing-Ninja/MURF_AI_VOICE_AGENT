# 🎙️ Multimodal Voice Agent - Day 1 MVP

A high-performance, real-time voice-to-voice customer support agent with **Sight** (Vision), **Memory** (RAG), and **Action** (Agentic Tools).

## ✅ PROJECT STATUS: COMPLETE

### Backend (Node.js + Express)
- ✅ **server.js** - Main orchestrator with direct Deepgram integration
- ✅ **aiController.js** - Gemini 2.0 Flash-Lite with strict TOON format
- ✅ **services/deepgramService.js** - Speech-to-Text (Nova-2, 16kHz)
- ✅ **services/geminiService.js** - AI Brain (TOON format, multimodal, tools)
- ✅ **services/murfService.js** - Text-to-Speech (Falcon, MP3)
- ✅ **services/ragService.js** - Vector DB (Pinecone + embeddings)
- ✅ **scripts/ingest.js** - Dynamic RAG ingestion CLI
- ✅ **public/index.html** - Single-file frontend (WebSocket + html2canvas)

### Frontend (React + Vite)
- ✅ **hooks/useAudioRecorder.js** - ⭐ Custom audio recording hook (250ms timeslice)
- ✅ **hooks/useWebSocket.js** - WebSocket connection management
- ✅ **App.jsx** - Main application component
- ✅ **Modern UI** - Clean, responsive design with emotion display

## 🎯 Features

- **🎤 Speech-to-Text**: Deepgram Nova-2 for real-time transcription (16kHz, linear16)
- **🧠 AI Brain**: Gemini 2.0 Flash-Lite with TOON (Token-Oriented Object Notation) format
- **🔊 Text-to-Speech**: Murf.ai Falcon for natural voice synthesis (MP3 streaming)
- **📚 RAG Memory**: Pinecone vector database with Gemini embeddings (768 dimensions)
- **👁️ Multimodal Vision**: "Look Over My Shoulder" screen capture analysis
- **🔧 Agentic Tools**: Execute actions (processRefund, updateAddress, checkOrderStatus, escalateToHuman)
- **⚡ Real-time**: WebSocket-based binary audio streaming with session management

## 📁 Project Structure

```
Voice_agent_bot/
├── server/                      # Backend (Node.js + Express)
│   ├── server.js                # The Orchestrator - coordinates all services
│   ├── aiController.js          # Gemini 2.0 Flash-Lite with strict TOON
│   ├── package.json             # Dependencies
│   ├── .env                     # API keys (already configured)
│   ├── services/
│   │   ├── deepgramService.js   # Speech-to-Text (Nova-2, 16kHz)
│   │   ├── geminiService.js     # AI Brain (TOON format, multimodal, tools)
│   │   ├── murfService.js       # Text-to-Speech (Falcon, MP3)
│   │   └── ragService.js        # Vector DB (Pinecone + embeddings)
│   ├── scripts/
│   │   └── ingest.js            # Dynamic RAG ingestion CLI
│   ├── public/
│   │   └── index.html           # Legacy single-file frontend
│   └── documents/
│       └── sample_knowledge.txt # Sample knowledge base
│
└── client/                      # Frontend (React + Vite) ⭐ NEW
    ├── package.json             # React 18 + Vite 5
    ├── vite.config.js           # Vite configuration
    ├── index.html               # HTML template
    └── src/
        ├── main.jsx             # React entry point
        ├── App.jsx              # Main application
        ├── App.css              # Styles
        ├── index.css            # Global styles
        └── hooks/
            ├── useAudioRecorder.js  # ⭐ Audio recording hook (250ms)
            └── useWebSocket.js      # WebSocket management
```

## 🚀 Quick Start

### Backend Setup

#### Option 1: Automated Setup (Recommended)
```bash
cd server
./setup.sh
```

#### Option 2: Manual Setup
```bash
cd server
npm install
node scripts/ingest.js ./documents/sample_knowledge.txt
npm start
```

Backend running on: **http://localhost:3000**

### Frontend Setup (React + Vite) ⭐ NEW

```bash
cd client
npm install
npm run dev
```

Frontend running on: **http://localhost:5173**

### Full Stack Testing

1. **Start Backend** (Terminal 1):
   ```bash
   cd server
   npm start
   ```

2. **Start Frontend** (Terminal 2):
   ```bash
   cd client
   npm run dev
   ```

3. **Open Browser**: http://localhost:5173

### Your First Interaction
1. Click **"🎤 Start Talking"**
2. Say: *"What is your refund policy?"*
3. Listen to the AI response!
4. Try: *"How long does shipping take?"*

## 🔧 Architecture Flow

```
┌──────────────┐
│   Client     │  • Mic (48kHz → 16kHz resampling)
│  (Browser)   │  • Audio Visualizer (Canvas Orb)
└──────┬───────┘  • Screen Capture (html2canvas)
       │ WebSocket (Binary Audio + JSON)
       ↓
┌─────────────────────────────────────────────────┐
│          SERVER.JS (The Orchestrator)           │
├─────────────────────────────────────────────────┤
│  Pipeline:                                      │
│  1. Binary Audio → Deepgram Live API            │
│     (direct integration, nova-2, 16kHz)         │
│  2. Transcript (speech_final=true) →            │
│     aiController.generateResponse()             │
│  3. TOON Response → Send to client              │
│  4. Text → murfService (TODO)                   │
│  5. MP3 Audio → Stream to client (TODO)         │
└────┬──────┬──────┬──────┬───────────────────────┘
     ↓      ↓      ↓      ↓
┌─────────┬────────┬──────┬─────────┐
│Deepgram │ Gemini │ Murf │Pinecone │
│ Nova-2  │2.0 Lite│Falcon│   RAG   │
│(Direct) │ Flash  │      │         │
└─────────┴────────┴──────┴─────────┘
```

### Deepgram Integration
**Direct integration in server.js** for live transcription:
- Uses `@deepgram/sdk` `createClient` and `listen.live()`
- Configuration: `nova-2`, `smart_format: true`, `interim_results: true`
- Audio format: `webm-opus` encoding (browser MediaRecorder compatible)
- Listens for `Transcript` events with automatic transcript extraction
- **Critical**: Only processes when `data.speech_final === true` to avoid interrupting mid-sentence
- Logs interim transcripts but doesn't trigger AI until speech is complete

**Important**: Changed from `linear16` to `webm-opus` encoding to support browser MediaRecorder API directly without transcoding.

### Data Flow Example
```
User: "What is your refund policy?"
  ↓
Deepgram Live: Transcribes speech, waits for speech_final=true
  ↓
AI Controller: Generates TOON response (under 20 words, with emotion)
  ↓
Client: Receives transcript + AI response
  ↓
TODO: Murf TTS → MP3 audio → Client playback
```

## 📊 TOON Format (Token-Oriented Object Notation)

The agent uses TOON format for structured responses:

### Strict Format (aiController.js)
```
response[1]{text,emotion}: <text>,<emotion>
```

**Rules:**
- Text must be under 20 words
- Emotion must be: happy, sad, angry, or neutral
- No extra text before or after format

**Examples:**
```
response[1]{text,emotion}: We offer a 30-day money-back guarantee,neutral
response[1]{text,emotion}: I understand your frustration. Let me help you,sad
response[1]{text,emotion}: You're very welcome! Happy to help,happy
```

### Extended Format (geminiService.js)
```
response[1]{text, emotion, action}: Your response text here
```

**Examples:**
```
response[1]{text, emotion:empathetic, action}: I completely understand your frustration.
response[1]{text, emotion, tool:processRefund, orderId:12345}: I've processed your refund.
```

### Parsing Functions

**aiController.js** - Strict TOON parser:
```javascript
// Regex: /response\[\d+\]\{text,emotion\}:\s*(.+?),\s*(happy|sad|angry|neutral)/i
const parsed = parseToon(response);
// Returns: { text: "...", emotion: "neutral", raw: "..." }
```

**geminiService.js** - Flexible parser with tool support:
```javascript
const parsed = parseTOON(response);
// Returns: { text: "...", emotion: "...", tool: "...", toolParams: {...} }
```

## 🛠️ Available Agent Tools

The AI can execute these actions:

1. **processRefund** - Process customer refunds
2. **updateAddress** - Update shipping addresses
3. **checkOrderStatus** - Check order tracking
4. **escalateToHuman** - Escalate to human agent

## 📚 RAG Ingestion

Add new knowledge to the agent dynamically:

```bash
# Ingest any text file
node scripts/ingest.js ./documents/new_policy.txt

# The script will:
# - Read the file
# - Split into ~1000 char chunks
# - Generate embeddings (Gemini)
# - Upload to Pinecone
```

**Example Output:**
```
═══════════════════════════════════════════════════
  🚀 RAG Ingestion Script
═══════════════════════════════════════════════════
📄 Reading file: documents/sample_knowledge.txt
✓ File loaded: 3.45 KB
✂️  Chunking text...
✓ Created 12 chunks
🧬 Generating embeddings...
  Processing chunk 1/12... ✓
  Processing chunk 12/12... ✓
📤 Uploading to Pinecone...
✓ Upload complete
📊 Index Statistics:
  Total vectors: 12
  Dimension: 768
✅ Ingestion Complete!
```

## 🔍 API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3000');
```

## 🎛️ Message Protocol

### Client → Server

**Binary Audio (PCM 16kHz)**
```javascript
ws.send(audioBuffer); // ArrayBuffer of Int16 audio samples
```

**JSON Control Messages**
```javascript
// Start recording
ws.send(JSON.stringify({ type: 'start_recording' }));

// Stop recording
ws.send(JSON.stringify({ type: 'stop_recording' }));

// Screen capture
ws.send(JSON.stringify({ 
  type: 'screen_capture', 
  image: 'base64_encoded_png_without_prefix'
}));

// Text input (alternative to voice)
ws.send(JSON.stringify({ 
  type: 'text_input', 
  text: 'What is your refund policy?' 
}));

// Health check
ws.send(JSON.stringify({ type: 'ping' }));
```

### Server → Client

**Binary Audio (MP3)**
```javascript
ws.onmessage = (event) => {
  if (event.data instanceof Blob) {
    // MP3 audio from Murf - play it
  }
}
```

**JSON Events**
```javascript
// Connection established
{
  type: 'connection',
  clientId: 'abc123',
  capabilities: { stt: 'Deepgram Nova-2', ... }
}

// Final transcript from Deepgram
{
  type: 'transcript',
  text: 'What is your refund policy?',
  isFinal: true
}

// Status updates
{ type: 'status', message: 'Searching knowledge base...' }
{ type: 'status', message: 'Thinking...' }
{ type: 'status', message: 'Generating voice...' }

// AI response with emotion and tool execution
{
  type: 'ai_response',
  text: 'We offer a 30-day money-back guarantee...',
  emotion: 'professional',
  tool: 'processRefund',  // if tool was used
  toolResult: { success: true, ... }
}

// Audio streaming events
{ type: 'audio_start', size: 156782 }
{ type: 'audio_complete' }

// Errors
{
  type: 'error',
  service: 'deepgram',
  message: 'Connection failed'
}
```

## 🐛 Troubleshooting

### Microphone Not Working
- ✅ Check browser permissions (Chrome/Edge recommended)
- ✅ Ensure HTTPS or localhost
- ✅ Check browser console for errors
- ✅ Verify getUserMedia API is supported

### No Audio Output
- ✅ Check speaker/volume settings
- ✅ Verify Murf API key in `.env` is valid
- ✅ Check network console for audio blob reception
- ✅ Try different browser (Chrome recommended)

### RAG Not Finding Context
- ✅ Verify Pinecone index exists: `voice-agent`
- ✅ Run ingestion script first: `node scripts/ingest.js ./documents/sample_knowledge.txt`
- ✅ Check if vectors exist: Add this to server.js temporarily
  ```javascript
  import { getIndexStats } from './services/ragService.js';
  console.log(await getIndexStats());
  ```

### Deepgram Connection Issues
- ✅ Verify API key in `.env` is valid
- ✅ Check for rate limiting (free tier limits)
- ✅ Ensure audio format is correct (16kHz, linear16, mono)
- ✅ Check Deepgram dashboard for usage/errors

### Server Won't Start
- ✅ Check if port 3000 is already in use: `lsof -i :3000`
- ✅ Verify all API keys are set in `.env`
- ✅ Run `npm install` to ensure dependencies are installed
- ✅ Check Node.js version (v18+ recommended)

### Common Error Messages

**"PINECONE_API_KEY not configured"**
```bash
# Make sure .env file exists and has the key
echo $PINECONE_API_KEY  # should not be empty
```

**"Cannot find module"**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**"WebSocket connection failed"**
```bash
# Server might not be running
# Check if server is on port 3000
curl http://localhost:3000/health
```

## 📝 Development

### Run in Dev Mode (Auto-reload)
```bash
npm run dev
```

### Environment Variables
Your `.env` file should contain:
```bash
DEEPGRAM_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
MURF_API_KEY=your_key_here
PINECONE_API_KEY=your_key_here
PINECONE_INDEX_NAME=voice-agent
PORT=3000
```

### Check Index Statistics
Add this utility code:
```javascript
import { getIndexStats } from './services/ragService.js';
const stats = await getIndexStats();
console.log(stats);
```

### Clear Pinecone Index (⚠️ Caution!)
```javascript
import { clearIndex } from './services/ragService.js';
await clearIndex(); // Deletes all vectors!
```

### Test Individual Services
```javascript
// Test Deepgram
import { createStream } from './services/deepgramService.js';

// Test Gemini
import { generateResponse } from './services/geminiService.js';
const response = await generateResponse("Hello");

// Test Murf
import { generateAudioStream } from './services/murfService.js';
const audio = await generateAudioStream("Hello world");

// Test RAG
import { queryContext } from './services/ragService.js';
const context = await queryContext("refund policy");
```

### Expected Server Logs
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 VOICE AGENT SERVER - DAY 1 MVP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📡 HTTP Server:       http://localhost:3000
  🔌 WebSocket Server:  ws://localhost:3000
  💚 Health Check:      http://localhost:3000/health
  🌐 Frontend:          http://localhost:3000

  🎙️  STT: Deepgram Nova-2
  🧠 LLM: Gemini 2.0 Flash-Lite (TOON Format)
  🔊 TTS: Murf Falcon
  📚 RAG: Pinecone + Gemini Embeddings
  👁️  Vision: Multimodal Screen Analysis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[abc123] 🔌 Client connected from ::1
[Deepgram] ✓ Connection established
[abc123] 🎤 Recording started
[Deepgram] 🎤 Final Transcript: "What is your refund policy?"
[abc123] ═══════════════════════════════════════
[abc123] 🎙️  USER: "What is your refund policy?"
[RAG] 🔍 Querying knowledge base...
[RAG] ✓ Found 3 relevant context chunks
[Gemini] 🧠 Processing request...
[abc123] 🧠 GEMINI: "We offer a 30-day money-back guarantee..."
[abc123]    Emotion: professional
[Murf] 🔊 Generating audio...
[Murf] ✓ Audio generated successfully (156782 bytes)
[abc123] ✅ Interaction complete
```

## 🔐 Security Notes

- Never commit `.env` file (already in `.gitignore`)
- API keys are production keys - keep secure
- Frontend uses `html2canvas` for screenshots (client-side only)
- Audio is streamed but not stored permanently

## 🚀 Production Deployment

### Deployment Checklist
```
□ Environment
  □ Set NODE_ENV=production
  □ Verify all API keys
  □ Configure correct PORT

□ Security
  □ Enable HTTPS/WSS (required for microphone)
  □ Configure CORS properly
  □ Add rate limiting middleware
  □ Add input validation
  □ Implement authentication

□ Monitoring
  □ Add logging service (Winston/Pino)
  □ Error tracking (Sentry)
  □ Performance metrics
  □ Uptime monitoring

□ Scaling
  □ Use PM2 or Docker
  □ Redis for session storage
  □ Load balancer for multiple instances
  □ CDN for static files
  □ Database backup strategy
```

### PM2 Deployment Example
```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name voice-agent

# Monitor
pm2 monit

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Nginx Reverse Proxy (for WSS)
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📦 Dependencies

### Core Dependencies
- **express** (^4.18.2) - HTTP server
- **ws** (^8.16.0) - WebSocket server for real-time communication
- **@deepgram/sdk** (^3.7.0) - Speech-to-Text API
- **@google/generative-ai** (^0.21.0) - LLM & Embeddings
- **@pinecone-database/pinecone** (^3.0.0) - Vector database
- **axios** (^1.6.8) - HTTP client for Murf API
- **dotenv** (^16.3.1) - Environment variables

### Frontend Dependencies (CDN)
- **html2canvas** (1.4.1) - Screen capture for multimodal vision

### Project Structure
```
server/
├── server.js                    # Main orchestrator (Deepgram direct integration)
├── aiController.js              # Gemini 2.0 Flash-Lite (strict TOON format)
├── package.json                 # Dependencies & scripts
├── .env                         # API keys (✅ configured)
├── .gitignore                   # Git ignore rules
├── setup.sh                     # Automated setup script
├── services/
│   ├── deepgramService.js       # STT with Nova-2 (legacy/helper)
│   ├── geminiService.js         # AI brain (full features, multimodal)
│   ├── murfService.js           # TTS with Falcon (MP3 arraybuffer)
│   └── ragService.js            # Pinecone vector DB operations
├── scripts/
│   └── ingest.js                # Dynamic CLI for knowledge ingestion
├── public/
│   └── index.html               # Single-file frontend (mic, visualizer, UI)
└── documents/
    └── sample_knowledge.txt     # Sample KB for testing
```

### Available NPM Scripts
```bash
npm start        # Start production server
npm run dev      # Start with auto-reload (--watch)
npm run ingest   # Alias for ingestion script
```

## 📄 License

ISC

## 👤 Author

Built for Day 1 MVP - High-Performance Multimodal Voice Agent

---

## 🎓 Additional Information

### How Session Management Works
Each connected client gets:
- Unique `clientId` for tracking
- Deepgram live connection (created on first audio/start_recording)
- Screen capture storage (cleared after use for privacy)
- Conversation history array

### AI Controller vs Gemini Service

**aiController.js** (Strict & Fast):
- Gemini 2.0 Flash-Lite model
- Strict TOON format: `response[1]{text,emotion}: text,emotion`
- Text limited to 20 words
- 4 emotions only: happy, sad, angry, neutral
- Perfect for quick voice responses
- Includes conversation history support

**geminiService.js** (Full Features):
- Gemini 2.0 Flash Exp model
- Extended TOON format with tools
- Multimodal support (text + images)
- Agentic tool execution
- Embedding generation for RAG
- More flexible for complex scenarios

### Speech-to-Text Behavior (speech_final)

The Deepgram integration uses `speech_final` to detect when the user has finished speaking:

**How it works:**
1. User speaks: *"Can you help me with..."* → Deepgram sends interim transcript (speech_final=false)
2. User continues: *"...my order issue?"* → Deepgram sends final transcript (speech_final=true)
3. **Only then** does the AI Controller generate a response

**Why this matters:**
- ✅ Prevents interrupting the user mid-sentence
- ✅ Ensures complete context before responding
- ✅ Creates natural conversation flow
- ❌ Without it, agent would respond to partial sentences

**Logging:**
- Interim results: `🎤 Interim: "Can you help me with"`
- Final results: `🎤 Deepgram Transcript (speech_final): "Can you help me with my order issue?"`

**Configuration in server.js:**
```javascript
if (transcript && transcript.trim().length > 0 && speechFinal) {
  // Process and generate AI response
} else if (transcript && transcript.trim().length > 0) {
  // Log interim but don't process
}
```

### TOON Format Deep Dive
**Pattern**: `response[index]{properties}: text`

**Examples**:
```
Simple: response[1]{text}: Hello! How can I help you?
With emotion: response[1]{text,emotion:empathetic}: I understand your frustration.
With tool: response[1]{text,tool:processRefund,orderId:12345}: Refund processed.
```

**Parsing**: The `geminiService.js` includes a `parseTOON()` function that extracts:
- `text` - The actual response
- `emotion` - Emotional tone (happy, sad, empathetic, professional, etc.)
- `tool` - Tool to execute (processRefund, updateAddress, etc.)
- `toolParams` - Parameters for tool execution

### Audio Format Requirements
**Input (Microphone)**:
- Browser captures at 48kHz
- Frontend resamples to 16kHz (Deepgram requirement)
- Converts to PCM Int16 (linear16 encoding)
- Streams as binary ArrayBuffer

**Output (Speaker)**:
- Murf returns MP3 (24kHz default)
- Frontend queues chunks
- Plays seamlessly using Audio() API

### Adding Custom Tools
Edit `services/geminiService.js`:
```javascript
const AGENT_TOOLS = {
  yourCustomTool: async (params) => {
    // Your implementation
    return { success: true, data: ... };
  }
};
```

Update system prompt to include the new tool.

### Customizing Agent Personality
Edit the `SYSTEM_PROMPT` in `services/geminiService.js`:
```javascript
const SYSTEM_PROMPT = `You are a [YOUR PERSONALITY HERE]...`;
```

### Frontend Customization
The `public/index.html` file contains:
- All HTML structure
- CSS styles (embedded)
- JavaScript logic (embedded)
- Can be modified to match your brand

### Security Best Practices
1. **Never commit `.env`** - Already in `.gitignore`
2. **Use HTTPS in production** - Required for microphone access
3. **Validate all inputs** - Add validation middleware
4. **Rate limit API calls** - Prevent abuse
5. **Sanitize screen captures** - Don't store permanently

### Performance Optimization Tips
1. **Connection pooling** - Reuse Deepgram connections per client
2. **Audio compression** - MP3 is already efficient
3. **Chunk RAG queries** - Batch similar queries
4. **Cache embeddings** - Store frequently used embeddings
5. **CDN for frontend** - Serve static files via CDN

### Testing Recommendations
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test WebSocket connection
# Use browser console:
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => console.log('Connected!');
ws.send(JSON.stringify({ type: 'ping' }));

# Test AI Controller (strict TOON)
node -e "import('./aiController.js').then(ai => ai.generateResponse('Hello').then(console.log))"

# Test RAG service
node -e "import('./services/ragService.js').then(r => r.queryContext('refund'))"

# Test ingestion
node scripts/ingest.js documents/sample_knowledge.txt
```

### Using AI Controller

**Basic Usage:**
```javascript
import { generateResponse } from './aiController.js';

// Simple response
const response = await generateResponse("What's your refund policy?");
console.log(response.text);      // "We offer a 30-day money-back guarantee"
console.log(response.emotion);   // "neutral"

// With conversation history
const history = [
  { user: "Hello", assistant: "Hi! How can I help?" }
];
const response2 = await generateResponse("I need a refund", history);
```

**Parsing TOON:**
```javascript
import { parseToon } from './aiController.js';

const rawResponse = "response[1]{text,emotion}: Thank you for contacting us,happy";
const parsed = parseToon(rawResponse);

console.log(parsed.text);      // "Thank you for contacting us"
console.log(parsed.emotion);   // "happy"
console.log(parsed.raw);       // Original response
```

**Validation:**
```javascript
import { validateToonResponse } from './aiController.js';

const isValid = validateToonResponse({
  text: "We can help you with that",
  emotion: "happy"
});
// Returns true if valid, logs warnings if issues found
```

### Common Customization Scenarios

**Change Voice**:
Edit `services/murfService.js`:
```javascript
voiceId: 'en-US-falcon' // Change to your preferred voice
```

**Adjust Speech Speed**:
```javascript
speed: 1.0 // Increase to 1.2 for faster speech
```

**Change Embedding Model**:
Edit `services/geminiService.js`:
```javascript
const EMBEDDING_MODEL = 'text-embedding-004'; // Or another model
```

**Modify Chunk Size**:
Edit `scripts/ingest.js`:
```javascript
chunkText(text, 1000) // Change 1000 to desired size
```

### Monitoring and Logs
All services log with prefixes:
- `[clientId]` - Server-level logs
- `[Deepgram]` - STT operations
- `[Gemini]` - LLM operations
- `[Murf]` - TTS operations
- `[RAG]` - Vector DB operations

Use these to trace issues:
```bash
# Filter logs by service
npm start 2>&1 | grep "\[Deepgram\]"
npm start 2>&1 | grep "\[RAG\]"
```

### Extending the System

**Add More Tools**:
1. Define tool in `AGENT_TOOLS` object
2. Add to system prompt
3. Handle in `executeToolIfNeeded()`

**Add Authentication**:
```javascript
// In server.js
wss.on('connection', (ws, req) => {
  const token = req.headers['authorization'];
  if (!verifyToken(token)) {
    ws.close(1008, 'Unauthorized');
    return;
  }
  // ... rest of logic
});
```

**Add Database Storage**:
```javascript
// Store conversations
session.conversationHistory.push({
  user: transcript,
  assistant: response.text,
  timestamp: new Date()
});

// Save to DB (MongoDB, PostgreSQL, etc.)
await db.conversations.insert(session.conversationHistory);
```

**Multi-Language Support**:
Edit Deepgram config in `services/deepgramService.js`:
```javascript
language: 'es-ES', // Spanish
// Or detect automatically
```

---

**🎉 YOU'RE ALL SET! Start building amazing voice experiences!**

For questions or issues, check the troubleshooting section above.

**Quick Commands**:
```bash
# Install & setup
cd server && npm install

# Ingest knowledge base
node scripts/ingest.js documents/sample_knowledge.txt

# Start server
npm start

# Open browser
open http://localhost:3000
```
