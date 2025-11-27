# 🎙️ Voice Agent Frontend (React + Vite)

High-performance frontend for the Multimodal Voice Agent with real-time audio streaming.

## 🎯 Features

- ✅ **Real-time Audio Streaming**: 250ms timeslice for low-latency
- ✅ **Custom Audio Hook**: `useAudioRecorder.js` for microphone management
- ✅ **WebSocket Integration**: Bidirectional communication with backend
- ✅ **Automatic Resampling**: Browser handles 48kHz → 16kHz conversion
- ✅ **Smart Permissions**: Handles mic permissions gracefully
- ✅ **Error Handling**: User-friendly error messages
- ✅ **Emotion Display**: Shows AI response emotions
- ✅ **Clean UI**: Modern, responsive design

## 📁 Project Structure

```
client/
├── package.json                 # Dependencies (React 18, Vite 5)
├── vite.config.js               # Vite configuration
├── index.html                   # HTML template
└── src/
    ├── main.jsx                 # React entry point
    ├── App.jsx                  # Main application component
    ├── App.css                  # Application styles
    ├── index.css                # Global styles
    └── hooks/
        ├── useAudioRecorder.js  # ⭐ Custom audio recording hook
        └── useWebSocket.js      # WebSocket connection hook
```

## 🚀 Quick Start

### Installation

```bash
cd client
npm install
```

### Development

```bash
npm run dev
```

Open: **http://localhost:5173**

### Production Build

```bash
npm run build
npm run preview
```

## 🎤 useAudioRecorder Hook

The core hook for handling microphone input with low-latency streaming.

### Features

- ✅ MediaRecorder API with **250ms timeslice**
- ✅ Automatic WebSocket streaming
- ✅ Proper cleanup on stop
- ✅ Error handling with user-friendly messages
- ✅ Microphone permission management

### API

```javascript
const { startRecording, stopRecording, isRecording, error } = useAudioRecorder(websocket);
```

**Returns:**
- `startRecording()` - Start recording from microphone
- `stopRecording()` - Stop recording and cleanup
- `isRecording` - Boolean recording state
- `error` - Error message (if any)

### Usage Example

```javascript
import { useState } from 'react';
import useWebSocket from './hooks/useWebSocket';
import useAudioRecorder from './hooks/useAudioRecorder';

function App() {
  const { ws, isConnected } = useWebSocket('ws://localhost:3000');
  const { startRecording, stopRecording, isRecording } = useAudioRecorder(ws);

  return (
    <button 
      onClick={isRecording ? stopRecording : startRecording}
      disabled={!isConnected}
    >
      {isRecording ? 'Stop' : 'Start'} Recording
    </button>
  );
}
```

## 🔧 Technical Details

### Audio Configuration

```javascript
{
  audio: {
    channelCount: 1,           // Mono audio
    sampleRate: 16000,         // 16kHz (Deepgram requirement)
    echoCancellation: true,    // Reduce echo
    noiseSuppression: true,    // Remove background noise
    autoGainControl: true      // Normalize volume
  }
}
```

### MediaRecorder Configuration

```javascript
{
  mimeType: 'audio/webm;codecs=opus',  // Or fallback to 'audio/webm'
  audioBitsPerSecond: 128000           // 128 kbps
}
```

### Streaming Logic

```javascript
mediaRecorder.ondataavailable = (event) => {
  if (event.data.size > 0) {
    // Check WebSocket is open
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log(`📤 Sending audio chunk: ${event.data.size} bytes`);
      websocket.send(event.data);  // Send binary Blob
    }
  }
};

// Start with 250ms timeslice for low latency
mediaRecorder.start(250);
```

## 🌐 WebSocket Protocol

### Messages Sent to Server

**1. Start Recording**
```json
{
  "type": "start_recording",
  "timestamp": 1234567890123
}
```

**2. Audio Data**
```
Binary Blob (audio/webm)
Sent every 250ms
```

**3. Stop Recording**
```json
{
  "type": "stop_recording",
  "timestamp": 1234567890123
}
```

### Messages Received from Server

**1. Transcript**
```json
{
  "type": "transcript",
  "text": "What is your refund policy?",
  "isFinal": true,
  "timestamp": 1234567890123
}
```

**2. AI Response**
```json
{
  "type": "ai_response",
  "text": "We offer a 30-day money-back guarantee",
  "emotion": "neutral",
  "timestamp": 1234567890123
}
```

**3. Error**
```json
{
  "type": "error",
  "message": "Failed to generate AI response",
  "timestamp": 1234567890123
}
```

**4. STT Ready**
```json
{
  "type": "stt_ready",
  "message": "Speech-to-text ready",
  "timestamp": 1234567890123
}
```

## 🎨 UI Components

### Recording Button
- **Idle State**: Blue gradient with 🎤 icon
- **Recording State**: Red gradient with 🔴 icon, pulsing animation
- **Disabled State**: Greyed out when WebSocket disconnected

### Status Indicator
- **Connected**: Green dot with "Connected" label
- **Disconnected**: Red dot with "Disconnected" label

### Transcript Display
- Shows user's speech after Deepgram transcription
- Left border in blue gradient
- Icon: 👤

### AI Response Display
- Shows AI's response with emotion badge
- Left border in purple gradient
- Icon: 🤖
- Emotion badges: happy (green), sad (blue), angry (red), neutral (gray)

## 🛠️ Error Handling

The hook handles common errors gracefully:

### Microphone Errors

| Error | Message | Resolution |
|-------|---------|------------|
| `NotAllowedError` | Microphone access denied | User must allow permissions |
| `NotFoundError` | No microphone found | Connect a microphone |
| `NotReadableError` | Mic in use by another app | Close other apps using mic |

### WebSocket Errors

| Error | Behavior | Resolution |
|-------|----------|------------|
| Connection lost | Auto-reconnect in 3s | Wait or refresh page |
| Not connected | Disable recording button | Wait for connection |

## 🔍 Debugging

Enable verbose logging:

```javascript
// In useAudioRecorder.js
console.log('🎤 Recording started with 250ms timeslice');
console.log('📤 Sending audio chunk:', event.data.size, 'bytes');
console.log('🛑 Recording stopped');
console.log('🔇 Microphone track stopped');
```

### Check Browser Console

- `🎤` = Recording events
- `📤` = Audio chunks sent
- `📨` = Messages received
- `✓` = Success
- `❌` = Errors
- `⚠️` = Warnings

## 📊 Performance

- **Latency**: ~250ms from speech to server
- **Audio Quality**: 128 kbps (good balance)
- **Chunk Size**: ~32KB per 250ms
- **Memory**: Minimal (no buffering)

## 🔐 Security

- HTTPS required for `getUserMedia()` in production
- WebSocket should use WSS (secure WebSocket)
- No audio data stored in browser
- Microphone access requires explicit user permission

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Output: `dist/` folder

### Deploy to Static Host

```bash
# Example: Vercel
vercel deploy

# Example: Netlify
netlify deploy --prod

# Example: GitHub Pages
npm run build
gh-pages -d dist
```

### Environment Variables

Create `.env` file:

```bash
VITE_WS_URL=wss://your-backend.com
```

Update `App.jsx`:

```javascript
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
```

## 🧪 Testing

### Manual Testing

1. **Microphone Access**:
   - Click "Start Talking"
   - Allow microphone permission
   - Verify recording indicator appears

2. **Audio Streaming**:
   - Speak for 5+ seconds
   - Check console for "📤 Sending audio chunk" logs
   - Verify chunks sent every ~250ms

3. **WebSocket Connection**:
   - Check status indicator is green
   - Kill backend, verify auto-reconnect
   - Verify recording disabled when disconnected

4. **Error Handling**:
   - Deny mic permission → See error banner
   - Disconnect mic → See error message

### Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Safari | 14+ | ✅ Fully supported |
| Edge | 90+ | ✅ Fully supported |

## 📚 Dependencies

```json
{
  "react": "^18.3.1",           // UI framework
  "react-dom": "^18.3.1",       // DOM rendering
  "@vitejs/plugin-react": "^4.3.4",  // Vite React plugin
  "vite": "^5.4.11"             // Build tool
}
```

**Total Size**: ~150KB (minified + gzipped)

## 🎯 Next Steps

- [ ] Add audio visualization (waveform/spectrum)
- [ ] Implement TTS audio playback from Murf
- [ ] Add screen capture for multimodal vision
- [ ] Support conversation history UI
- [ ] Add voice activity detection (VAD)
- [ ] Implement push-to-talk mode

## 📖 API Reference

### useAudioRecorder(websocket)

**Parameters:**
- `websocket` (WebSocket|null) - Active WebSocket connection

**Returns:**
```typescript
{
  startRecording: () => Promise<void>,
  stopRecording: () => void,
  isRecording: boolean,
  error: string | null
}
```

### useWebSocket(url)

**Parameters:**
- `url` (string) - WebSocket server URL

**Returns:**
```typescript
{
  ws: WebSocket | null,
  isConnected: boolean,
  error: string | null,
  sendMessage: (data: object) => void,
  connect: () => void,
  disconnect: () => void
}
```

## 💡 Tips

1. **Latency Optimization**: 250ms is optimal balance between latency and bandwidth
2. **Sample Rate**: 16kHz is required by Deepgram Nova-2
3. **Mono Audio**: Single channel reduces bandwidth by 50%
4. **Echo Cancellation**: Critical for speaker + mic scenarios
5. **Noise Suppression**: Improves transcription accuracy

## 🐛 Troubleshooting

**Q: No audio chunks being sent?**
- Check WebSocket connection status (should be green)
- Verify microphone permissions are granted
- Check browser console for errors
- Ensure backend is running on port 3000

**Q: Getting ScriptProcessorNode deprecation warning?**
- This is a browser warning and won't affect functionality
- The warning comes from internal browser audio processing
- Modern browsers handle this automatically
- Can be safely ignored (will be fixed in future browser updates)

**Q: WebSocket connects but no transcripts?**
- Verify backend Deepgram configuration uses `webm-opus` encoding
- Check backend console for "Sending audio chunk to Deepgram" logs
- Ensure Deepgram API key is valid in backend `.env`
- Check if audio chunks are actually being sent (look for 📤 logs)

**Q: High latency?**
- Reduce timeslice (but increases bandwidth)
- Check network connection
- Verify backend processing speed

**Q: Poor audio quality?**
- Increase `audioBitsPerSecond`
- Check microphone quality
- Reduce background noise

**Q: MediaRecorder not supported?**
- Update browser to latest version
- Check browser compatibility table
- Use polyfill for older browsers

## 📝 License

MIT License - Part of Voice Agent project

---

**Built with ❤️ using React + Vite**
