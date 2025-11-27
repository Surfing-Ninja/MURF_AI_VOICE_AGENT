# 🎙️ Multimodal Voice Agent - Full Stack

A high-performance, real-time voice-to-voice customer support agent with **Sight** (Vision), **Memory** (RAG), and **Action** (Agentic Tools).

Built with **Node.js** backend + **React + Vite** frontend.

## 🎯 Features

- 🎤 **Real-time Speech-to-Text**: Deepgram Nova-2 with 250ms streaming
- 🧠 **AI Brain**: Gemini 2.0 Flash-Lite with emotion-aware responses
- 🔊 **Text-to-Speech**: Murf.ai Falcon (ready for integration)
- 📚 **RAG Memory**: Pinecone vector database with knowledge retrieval
- 👁️ **Multimodal Vision**: Screen capture analysis capability
- 🔧 **Agentic Tools**: Execute actions (refunds, updates, etc.)
- ⚡ **Low Latency**: 250ms audio chunks + speech_final detection

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │  • useAudioRecorder (250ms timeslice)
│   (Port 5173)   │  • WebSocket connection
└────────┬────────┘  • Audio streaming
         │ 
         │ WebSocket (ws://localhost:3000)
         ↓
┌─────────────────┐
│  Node.js Server │  • Direct Deepgram integration
│   (Port 3000)   │  • AI Controller (speech_final check)
└────────┬────────┘  • Session management
         ↓
    ┌────┴────┬────────┬────────┐
    ↓         ↓        ↓        ↓
Deepgram  Gemini    Murf   Pinecone
 Nova-2   Flash    Falcon    RAG
```

## 📁 Project Structure

```
Voice_agent_bot/
│
├── server/                          # Backend (Node.js + Express)
│   ├── server.js                    # Main orchestrator
│   ├── aiController.js              # Strict TOON format AI
│   ├── services/                    # Core services
│   │   ├── deepgramService.js       # STT
│   │   ├── geminiService.js         # LLM
│   │   ├── murfService.js           # TTS
│   │   └── ragService.js            # Vector DB
│   ├── scripts/
│   │   └── ingest.js                # RAG ingestion
│   └── README.md                    # Backend docs
│
├── client/                          # Frontend (React + Vite) ⭐
│   ├── src/
│   │   ├── App.jsx                  # Main component
│   │   └── hooks/
│   │       ├── useAudioRecorder.js  # ⭐ Audio hook (250ms)
│   │       └── useWebSocket.js      # WebSocket hook
│   └── README.md                    # Frontend docs
│
└── README.md                        # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- API keys for:
  - Deepgram (Speech-to-Text)
  - Google Gemini (AI)
  - Murf.ai (Text-to-Speech)
  - Pinecone (Vector DB)

### 1. Clone Repository

```bash
git clone <your-repo>
cd Voice_agent_bot
```

### 2. Backend Setup

```bash
cd server
npm install

# Configure API keys in .env
# Already done if you followed initial setup

# Ingest sample knowledge
node scripts/ingest.js ./documents/sample_knowledge.txt

# Start backend
npm start
```

✅ Backend running on: **http://localhost:3000**

### 3. Frontend Setup

```bash
cd ../client
npm install

# Start frontend
npm run dev
```

✅ Frontend running on: **http://localhost:5173**

### 4. Test the System

1. Open browser: **http://localhost:5173**
2. Click **"Start Talking"**
3. Say: *"What is your refund policy?"*
4. Wait for AI response!

## 🎤 Frontend Features

### useAudioRecorder Hook

The core audio recording hook with:

- ✅ **250ms timeslice** for low-latency streaming
- ✅ **Automatic WebSocket streaming** of audio chunks
- ✅ **Microphone permission handling**
- ✅ **Error handling** with user-friendly messages
- ✅ **Proper cleanup** on stop

**API:**
```javascript
const { startRecording, stopRecording, isRecording, error } = useAudioRecorder(websocket);
```

**Audio Configuration:**
- Sample Rate: 16kHz (Deepgram requirement)
- Channels: Mono (1 channel)
- Format: audio/webm;codecs=opus
- Bitrate: 128 kbps

**Key Implementation:**
```javascript
// MediaRecorder with 250ms timeslice
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0 && websocket.readyState === WebSocket.OPEN) {
    websocket.send(event.data);  // Send binary Blob
  }
};

mediaRecorder.start(250);  // 250ms chunks
```

## 🔧 Backend Features

### Direct Deepgram Integration

- Uses `@deepgram/sdk` with `listen.live()`
- Configuration: `nova-2`, `smart_format`, `linear16` @ 16kHz
- **Critical**: Only processes when `speech_final=true`

### AI Controller (Strict TOON)

- Model: Gemini 2.0 Flash-Lite
- Format: `response[1]{text,emotion}: text,emotion`
- Max 20 words per response
- 4 emotions: happy, sad, angry, neutral

### speech_final Behavior

```javascript
if (transcript && transcript.trim().length > 0 && speechFinal) {
  // User finished speaking - generate response
  const aiResponse = await generateResponse(transcript);
} else if (transcript && transcript.trim().length > 0) {
  // Interim result - log but don't process
  console.log('🎤 Interim:', transcript);
}
```

## 📊 Data Flow

```
1. User speaks into microphone
   ↓
2. useAudioRecorder captures audio (250ms chunks)
   ↓
3. WebSocket sends binary audio to server
   ↓
4. Deepgram transcribes (waits for speech_final=true)
   ↓
5. AI Controller generates TOON response
   ↓
6. Server sends transcript + AI response to client
   ↓
7. Frontend displays both
   ↓
8. TODO: Murf TTS converts to audio
   ↓
9. TODO: Client plays audio response
```

## 🌐 WebSocket Protocol

### Client → Server

**Binary Audio Data:**
```
Blob (audio/webm)
Sent every 250ms
```

**Control Messages:**
```json
{ "type": "start_recording", "timestamp": 1234567890 }
{ "type": "stop_recording", "timestamp": 1234567890 }
```

### Server → Client

```json
// Transcript
{
  "type": "transcript",
  "text": "What is your refund policy?",
  "isFinal": true,
  "timestamp": 1234567890
}

// AI Response
{
  "type": "ai_response",
  "text": "We offer a 30-day money-back guarantee",
  "emotion": "neutral",
  "timestamp": 1234567890
}

// Error
{
  "type": "error",
  "message": "Error message",
  "timestamp": 1234567890
}
```

## 🎨 UI Components

### Recording Button
- Idle: Blue gradient with 🎤 icon
- Recording: Red gradient with 🔴 icon (pulsing)
- Disabled when WebSocket disconnected

### Status Indicators
- Connection status (green = connected, red = disconnected)
- Recording indicator with pulse animation

### Display Sections
- **Transcript**: User's speech with 👤 icon
- **AI Response**: Agent's reply with 🤖 icon + emotion badge
- **Instructions**: Help text when idle

## 🐛 Debugging

### Backend Logs

```
🎤 Deepgram Transcript (speech_final): "..."
🧠 Calling AI Controller...
✓ AI Response - Text: "..." / Emotion: neutral
```

### Frontend Logs

```
📤 Sending audio chunk: 32768 bytes
📨 Received: transcript
📨 Received: ai_response
```

## ⚠️ Known Limitations

- [ ] TTS (Murf) not yet integrated in frontend
- [ ] No audio playback of AI responses yet
- [ ] No conversation history UI
- [ ] No screen capture in React frontend
- [ ] No audio visualization

## 🚀 Next Steps

### High Priority
1. Integrate Murf TTS in frontend
2. Add audio playback for AI responses
3. Implement conversation history UI

### Medium Priority
4. Add audio visualization (waveform/spectrum)
5. Implement screen capture for vision
6. Add push-to-talk mode option
7. Support voice activity detection (VAD)

### Low Priority
8. Add user authentication
9. Implement conversation export
10. Add analytics dashboard

## 📚 Documentation

- **Backend**: `/server/README.md` - Complete backend documentation
- **Frontend**: `/client/README.md` - Complete frontend documentation
- **This File**: Overview and quick start

## 🧪 Testing

### Manual Test Flow

1. **WebSocket Connection**:
   - Start backend
   - Start frontend
   - Verify green status indicator

2. **Audio Recording**:
   - Click "Start Talking"
   - Allow microphone permissions
   - Speak for 3+ seconds
   - Check console for audio chunks

3. **Transcription**:
   - Speak clearly: "What is your refund policy?"
   - Wait for transcript to appear
   - Verify speech_final triggered

4. **AI Response**:
   - Verify AI response appears below transcript
   - Check emotion badge displays correctly
   - Verify response is under 20 words

5. **Error Handling**:
   - Deny mic permissions → See error banner
   - Kill backend → Verify auto-reconnect
   - Disconnect mic → See error message

## 📊 Performance

- **Audio Latency**: ~250ms (chunk size)
- **Transcription**: ~500ms (Deepgram processing)
- **AI Response**: ~1-2s (Gemini generation)
- **Total Latency**: ~2-3s from speech end to response

## 🔐 Security

- HTTPS required for `getUserMedia()` in production
- Use WSS (secure WebSocket) in production
- API keys stored in `.env` (never commit)
- No audio data stored (privacy-first)

## 🌍 Deployment

### Backend (Node.js)

```bash
# Build
cd server
npm install

# Deploy to Heroku/Railway/Fly.io
# Set environment variables
# Update WebSocket URL
```

### Frontend (React)

```bash
# Build
cd client
npm run build

# Deploy to Vercel/Netlify/Cloudflare Pages
# Update VITE_WS_URL to production backend
```

## 📝 Environment Variables

### Backend (.env)

```bash
DEEPGRAM_API_KEY=your_key
GEMINI_API_KEY=your_key
MURF_API_KEY=your_key
PINECONE_API_KEY=your_key
PINECONE_ENVIRONMENT=your_env
PINECONE_INDEX=voice-agent-kb
```

### Frontend (.env)

```bash
VITE_WS_URL=ws://localhost:3000  # Development
# VITE_WS_URL=wss://your-backend.com  # Production
```

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- WebSocket (ws library)
- Deepgram SDK (@deepgram/sdk)
- Google Generative AI (@google/generative-ai)
- Pinecone SDK (@pinecone-database/pinecone)

### Frontend
- React 18
- Vite 5
- Native Web APIs (MediaRecorder, WebSocket, getUserMedia)

## 📖 API Credits

- **Deepgram**: Speech-to-Text (Nova-2)
- **Google Gemini**: AI Brain (2.0 Flash-Lite)
- **Murf.ai**: Text-to-Speech (Falcon)
- **Pinecone**: Vector Database

## 💡 Tips

1. **Low Latency**: 250ms timeslice is optimal balance
2. **Speech Detection**: speech_final prevents interrupting user
3. **Error Handling**: Always check WebSocket state before sending
4. **Audio Quality**: 128 kbps is good balance for voice
5. **Cleanup**: Always stop tracks when recording stops

## 🤝 Contributing

Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📄 License

MIT License

---

**Built with ❤️ for high-performance voice AI**

**Stack**: Node.js + React + Deepgram + Gemini + Murf + Pinecone
