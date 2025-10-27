import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../App';

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const UpArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5L12 19" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 11L12 5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 11L12 5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);


const LoadingBubble: React.FC = () => (
    <div className="flex justify-start">
        <div className="bg-gray-700/80 rounded-lg p-3 max-w-sm">
            <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse [animation-delay:0.2s]"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse [animation-delay:0.4s]"></div>
            </div>
        </div>
    </div>
);


const ChatPanel: React.FC<ChatPanelProps> = ({ chatHistory, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chatHistory, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black relative">
        <header className="p-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <h1 className="text-xl font-bold text-gray-200">
            <span role="img" aria-label="robot" className="mr-2">🤖</span>
            AI Assistant
          </h1>
        </header>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-xl p-3 max-w-md whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600/90 text-white' : 'bg-gray-700/80 text-gray-200'}`}>
                        {msg.content}
                    </div>
                </div>
            ))}
            {isLoading && <LoadingBubble />}
            <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 shrink-0">
            <form onSubmit={handleSubmit} className="relative">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., 'Add a title that says Hello World'"
                    className="w-full h-24 p-4 pr-16 text-lg bg-white/5 border border-white/20 rounded-2xl resize-none backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all"
                    disabled={isLoading}
                    aria-label="Chat input"
                />
                <button
                    type="submit"
                    className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center transition-transform transform hover:scale-110 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading || !input.trim()}
                    aria-label="Send message"
                >
                    <UpArrowIcon />
                </button>
            </form>
        </div>
    </div>
  );
};

export default ChatPanel;
