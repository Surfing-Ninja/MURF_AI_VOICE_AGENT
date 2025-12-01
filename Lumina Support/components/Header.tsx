import React from 'react';

interface Props {
  isConnected: boolean;
  onTestAudio: () => void;
}

export const Header: React.FC<Props> = ({ isConnected, onTestAudio }) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
            <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .75c2.456-.368 4.908-.368 7.364 0 2.456.368 4.908.368 7.364 0a.75.75 0 001-.75V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
          </svg>
        </div>
        <div>
          <h1 className="font-semibold text-lg tracking-tight text-white">Lumina Support</h1>
          <p className="text-xs text-slate-400">Voice-Activated Assistant</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={onTestAudio}
          className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-colors flex items-center gap-2"
          title="Play a test sound to verify audio output"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10 3.75a2 2 0 10-4 0 2 2 0 004 0zM17.25 4.5a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0v-5zM12.75 13.5a.75.75 0 00-1.5 0v-5a.75.75 0 001.5 0v5zM5 10.5a.75.75 0 01.75.75v5a.75.75 0 01-1.5 0v-5a.75.75 0 01.75-.75z" />
          </svg>
          Test Audio
        </button>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></span>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
};