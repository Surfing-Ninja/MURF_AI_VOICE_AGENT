import React from 'react';
import { ChatMessage } from '../types';

interface Props {
  message: ChatMessage;
}

export const ChatMessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-zinc-400 bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-700">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
          isUser
            ? 'bg-amber-500 text-white rounded-br-none shadow-amber-500/20'
            : 'bg-zinc-800 text-zinc-100 rounded-bl-none border border-zinc-700'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.text}
        </p>
        {!message.isFinal && (
          <span className="inline-flex ml-2">
            <span className="animate-pulse text-xs opacity-70">●</span>
          </span>
        )}
      </div>
    </div>
  );
};
