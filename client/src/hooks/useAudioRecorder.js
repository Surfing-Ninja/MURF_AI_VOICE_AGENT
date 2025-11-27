import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for handling microphone input with low-latency streaming
 * 
 * Features:
 * - Real-time audio capture from microphone
 * - MediaRecorder with 250ms timeslice for low latency
 * - Automatic WebSocket streaming when connected
 * - Proper cleanup and error handling
 * 
 * @param {WebSocket|null} websocket - Active WebSocket connection
 * @returns {Object} { startRecording, stopRecording, isRecording, error }
 */
export const useAudioRecorder = (websocket) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);

  /**
   * Start recording audio from microphone
   * - Requests microphone access
   * - Creates MediaRecorder with 250ms timeslice
   * - Streams audio chunks to WebSocket server
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Check if WebSocket is available and connected
      if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket is not connected');
      }

      console.log('🎤 Starting recording...');

      // Request microphone access with basic constraints
      // Browser will handle resampling to 16kHz
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      // Determine best supported MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      console.log(`🎙️ Using MIME type: ${mimeType}`);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000 // 128 kbps for good quality
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data availability - stream to server every 250ms
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          // Check if WebSocket is still open before sending
          if (websocket && websocket.readyState === WebSocket.OPEN) {
            console.log(`📤 Sending audio chunk: ${event.data.size} bytes, type: ${event.data.type}`);
            websocket.send(event.data);
          } else {
            console.warn('⚠️ WebSocket not open, skipping audio chunk');
          }
        } else {
          console.warn('⚠️ Received empty audio chunk');
        }
      };

      // Handle recording errors
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        setError(`Recording error: ${event.error.message}`);
        stopRecording();
      };

      // Handle recording start
      mediaRecorder.onstart = () => {
        console.log('✅ MediaRecorder started successfully');
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        console.log('🛑 MediaRecorder stopped');
        setIsRecording(false);
      };

      // Notify server that recording is starting
      websocket.send(JSON.stringify({
        type: 'start_recording',
        timestamp: Date.now()
      }));
      console.log('📤 Sent start_recording message');

      // Start recording with 250ms timeslice for low latency
      mediaRecorder.start(250);
      setIsRecording(true);

      console.log('🎤 Recording started with 250ms timeslice');

    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      
      let errorMessage = 'Failed to start recording';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please allow microphone permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone.';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsRecording(false);
    }
  }, [websocket]);

  /**
   * Stop recording and cleanup resources
   * - Stops MediaRecorder
   * - Closes microphone stream
   * - Notifies server
   */
  const stopRecording = useCallback(() => {
    try {
      // Stop MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Stop all audio tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('🔇 Microphone track stopped');
        });
        streamRef.current = null;
      }

      // Notify server that recording has stopped
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'stop_recording',
          timestamp: Date.now()
        }));
      }

      setIsRecording(false);
      console.log('✓ Recording stopped and cleaned up');

    } catch (err) {
      console.error('❌ Error stopping recording:', err);
      setError(`Error stopping recording: ${err.message}`);
    }
  }, [websocket]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    error
  };
};

export default useAudioRecorder;
