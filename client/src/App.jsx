import { useState, useEffect } from 'react';
import useWebSocket from './hooks/useWebSocket';
import useAudioRecorder from './hooks/useAudioRecorder';
import './App.css';

// WebSocket server URL - update this to match your backend
const WS_URL = 'ws://localhost:3000';

function App() {
  const { ws, isConnected, error: wsError } = useWebSocket(WS_URL);
  const { startRecording, stopRecording, isRecording, error: recError } = useAudioRecorder(ws);
  
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [messages, setMessages] = useState([]);

  // Listen for WebSocket messages
  useEffect(() => {
    const handleMessage = (event) => {
      const data = event.detail;

      switch (data.type) {
        case 'transcript':
          console.log('📝 Transcript:', data.text);
          setTranscript(data.text);
          break;

        case 'ai_response':
          console.log('🤖 AI Response:', data.text, `(${data.emotion})`);
          setAiResponse(data);
          
          // Add to messages
          setMessages(prev => [...prev, {
            type: 'ai',
            text: data.text,
            emotion: data.emotion,
            timestamp: data.timestamp
          }]);
          break;

        case 'error':
          console.error('❌ Server error:', data.message);
          break;

        case 'stt_ready':
          console.log('✓ Speech-to-text ready');
          break;

        case 'recording_started':
          console.log('✓ Recording acknowledged by server');
          break;

        default:
          console.log('📨 Message:', data.type, data);
      }
    };

    window.addEventListener('websocket-message', handleMessage);

    return () => {
      window.removeEventListener('websocket-message', handleMessage);
    };
  }, []);

  // Handle recording toggle
  const handleRecordingToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
      setTranscript('');
      setAiResponse(null);
    }
  };

  return (
    <div className="app">
      <div className="container">
        {/* Header */}
        <header className="header">
          <h1>🎙️ Multimodal Voice Agent</h1>
          <p className="subtitle">High-Performance Customer Support</p>
          
          <div className="status-bar">
            <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="dot"></span>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </header>

        {/* Error Display */}
        {(wsError || recError) && (
          <div className="error-banner">
            ⚠️ {wsError || recError}
          </div>
        )}

        {/* Recording Control */}
        <div className="recording-section">
          <button
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={handleRecordingToggle}
            disabled={!isConnected}
          >
            <div className="icon">
              {isRecording ? '🔴' : '🎤'}
            </div>
            <div className="label">
              {isRecording ? 'Stop Talking' : 'Start Talking'}
            </div>
          </button>

          {isRecording && (
            <div className="recording-indicator">
              <span className="pulse"></span>
              Recording...
            </div>
          )}
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="transcript-section">
            <div className="section-header">
              <span className="icon">👤</span>
              <span>You said:</span>
            </div>
            <div className="transcript-box">
              {transcript}
            </div>
          </div>
        )}

        {/* AI Response Display */}
        {aiResponse && (
          <div className="response-section">
            <div className="section-header">
              <span className="icon">🤖</span>
              <span>AI Response:</span>
              <span className={`emotion-badge ${aiResponse.emotion}`}>
                {aiResponse.emotion}
              </span>
            </div>
            <div className="response-box">
              {aiResponse.text}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isRecording && messages.length === 0 && (
          <div className="instructions">
            <h3>💡 How to Use</h3>
            <ol>
              <li>Click <strong>"Start Talking"</strong> to begin</li>
              <li>Speak your question or request</li>
              <li>Click <strong>"Stop Talking"</strong> when done</li>
              <li>Wait for the AI response!</li>
            </ol>
            
            <div className="features">
              <h4>✨ Features</h4>
              <ul>
                <li>🎤 Real-time speech recognition (Deepgram Nova-2)</li>
                <li>🧠 AI responses with emotion (Gemini 2.0 Flash-Lite)</li>
                <li>⚡ Low-latency streaming (250ms chunks)</li>
                <li>🎯 Smart speech detection (speech_final)</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="footer">
          <p>Powered by Deepgram • Gemini • Murf.ai • Pinecone</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
