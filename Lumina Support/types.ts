export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  isFinal: boolean;
  timestamp: Date;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

// Helper type for audio blobs
export interface PcmBlob {
  data: string; // Base64 encoded
  mimeType: string;
}
