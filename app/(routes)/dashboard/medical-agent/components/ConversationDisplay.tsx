"use client"
import { Message } from './ConversationManager';
import { Mic, MicOff } from 'lucide-react';

interface ConversationDisplayProps {
  messages: Message[];
  userCaption: string;
  assistantCaption: string;
  isCallActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
}

const ConversationDisplay = ({
  messages,
  userCaption,
  assistantCaption,
  isCallActive,
  isListening,
  isSpeaking
}: ConversationDisplayProps) => {
  return (
    <div className='flex flex-col gap-2 mt-10 w-full max-w-md'>
      {/* Message history */}
      <div className='max-h-[300px] overflow-y-auto p-4 border rounded-lg mb-4'>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-3 ${message.role === 'assistant' ? 'text-blue-600' : 'text-green-600'}`}
          >
            <strong>{message.role === 'assistant' ? '🩺 Doctor: ' : '👤 User: '}</strong>
            <span>{message.content}</span>
          </div>
        ))}
      </div>

      {/* User caption with listening indicator */}
      <div className='border p-2 rounded-md bg-gray-50 min-h-[40px] mb-2 flex justify-between items-center'>
        <p className='text-sm text-gray-500'>👤 User: {userCaption}</p>
        {isCallActive && (
          <div className="flex items-center">
            {isListening ? (
              <Mic className="h-4 w-4 text-green-500 animate-pulse" />
            ) : (
              <MicOff className="h-4 w-4 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {/* Assistant caption with speaking indicator */}
      <div className='border p-2 rounded-md bg-gray-50 min-h-[40px] flex justify-between items-center'>
        <p className='text-sm text-blue-500'>🩺 Doctor: {assistantCaption}</p>
        {isCallActive && isSpeaking && (
          <div className="flex space-x-1">
            <div className="w-1 h-4 bg-blue-500 animate-pulse rounded-full"></div>
            <div className="w-1 h-4 bg-blue-500 animate-pulse rounded-full animation-delay-200"></div>
            <div className="w-1 h-4 bg-blue-500 animate-pulse rounded-full animation-delay-400"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationDisplay; 