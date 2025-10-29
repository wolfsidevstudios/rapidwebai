import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../App';
import { integrations, Integration } from './integrations';
import ImageGenerationModal from './ImageGenerationModal';

interface ChatPanelProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string, image?: string) => void;
  isLoading: boolean;
  selectedApis: string[];
  onSelectedApisChange: (apis: string[]) => void;
  chatInput: string;
  onChatInputChange: (value: string) => void;
}

const UpArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5L12 19" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 11L12 5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 11L12 5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

const ApiPill: React.FC<{api: Integration, onRemove: () => void}> = ({ api, onRemove }) => (
    <div className="flex items-center gap-1.5 bg-white text-black rounded-full px-2 py-1 text-xs font-medium shadow">
        <span className="w-4 h-4 flex items-center justify-center">{api.icon}</span>
        <span>{api.name}</span>
        <button onClick={onRemove} className="w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors">&times;</button>
    </div>
);

const ChatPanel: React.FC<ChatPanelProps> = ({ chatHistory, onSendMessage, isLoading, selectedApis, onSelectedApisChange, chatInput, onChatInputChange }) => {
  const [showApiMenu, setShowApiMenu] = useState(false);
  const [availableApis, setAvailableApis] = useState<Integration[]>([]);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const configuredApis = integrations.filter(int => {
        if (int.type === 'public') return true;
        if (int.type === 'config' && localStorage.getItem('integration_key_firebase')) return true;
        if (int.type === 'private' && localStorage.getItem(`integration_key_${int.id}`)) return true;
        return false;
    });
    setAvailableApis(configuredApis);
  }, []);

  // When chatInput is updated externally (e.g. by suggestion click), focus the textarea.
  useEffect(() => {
    if (chatInput) {
        textAreaRef.current?.focus();
    }
  }, [chatInput]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [chatHistory, isLoading]);

  const handleApiSelect = (apiId: string) => {
    if (!selectedApis.includes(apiId)) {
        onSelectedApisChange([...selectedApis, apiId]);
    }
    onChatInputChange(chatInput.replace(/\/api$/, ''));
    setShowApiMenu(false);
  };
  
  const handleApiRemove = (apiId: string) => {
    onSelectedApisChange(selectedApis.filter(id => id !== apiId));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.endsWith('/api')) {
        setShowApiMenu(true);
    } else if (showApiMenu) {
        setShowApiMenu(false);
    }
    onChatInputChange(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isLoading) {
      onSendMessage(chatInput);
      onChatInputChange('');
    }
  };

  const handleSendMessageWithImage = (prompt: string, image: string) => {
    onSendMessage(prompt, image);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const hasSelectedApis = selectedApis.length > 0;

  return (
    <div className="h-full flex flex-col bg-black relative">
        <ImageGenerationModal
            isOpen={isImageModalOpen}
            onClose={() => setIsImageModalOpen(false)}
            onAddToChat={handleSendMessageWithImage}
        />

        <header className="p-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <h1 className="text-xl font-bold text-gray-200">
            <span role="img" aria-label="robot" className="mr-2">🤖</span>
            AI Assistant
          </h1>
        </header>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`rounded-xl p-3 max-w-md ${msg.role === 'user' ? 'bg-blue-600/90 text-white' : 'bg-gray-700/80 text-gray-200'}`}>
                        {msg.image && (
                           <img src={msg.image} alt="User generated content" className="rounded-lg mb-2 max-w-full h-auto max-h-64 object-contain" />
                        )}
                        {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                    </div>
                </div>
            ))}
            {isLoading && <LoadingBubble />}
            <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 shrink-0">
            <form onSubmit={handleSubmit} className="relative">
                <div 
                    className={`absolute bottom-full mb-2 w-full bg-white rounded-2xl shadow-lg p-2 transition-all duration-300 ease-in-out ${showApiMenu ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                >
                    <p className="px-2 pb-1 text-xs text-gray-500 font-semibold">Available Integrations</p>
                    <div className="max-h-48 overflow-y-auto">
                        {availableApis.map(api => (
                            <button 
                                key={api.id}
                                type="button"
                                onClick={() => handleApiSelect(api.id)}
                                className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100"
                            >
                                <span className="w-6 h-6 flex items-center justify-center">{api.icon}</span>
                                <span className="text-gray-800 font-medium">{api.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                {hasSelectedApis && (
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 p-1">
                       {selectedApis.map(apiId => {
                            const api = integrations.find(i => i.id === apiId);
                            return api ? <ApiPill key={api.id} api={api} onRemove={() => handleApiRemove(api.id)} /> : null
                       })}
                    </div>
                )}
                
                <textarea
                    ref={textAreaRef}
                    value={chatInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., 'Add a title that says Hello World' or type '/api'"
                    className={`w-full h-24 p-4 pl-16 pr-16 text-lg bg-white/5 border border-white/20 rounded-2xl resize-none backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all ${hasSelectedApis ? 'pb-14' : ''}`}
                    disabled={isLoading}
                    aria-label="Chat input"
                />
                <button
                    type="button"
                    onClick={() => setIsImageModalOpen(true)}
                    className="group absolute bottom-4 left-4 w-12 h-12 rounded-full flex items-center justify-center transition-transform transform hover:bg-white/10"
                    aria-label="Generate with image or icon"
                >
                    <ImageIcon />
                </button>
                <button
                    type="submit"
                    className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center transition-transform transform hover:scale-110 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading || !chatInput.trim()}
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
